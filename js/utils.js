(function() {
  
  const normalize = (str) => str.replace(/\r\n/g, '\n').trim();

  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  const readAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resolvePath = (baseFile, relativePath) => {
      if (!relativePath) return relativePath;
      if (relativePath.startsWith('/')) return relativePath.slice(1);
      if (relativePath.startsWith('http') || relativePath.startsWith('data:')) return relativePath;

      const baseParts = baseFile.split('/');
      baseParts.pop(); 

      const relParts = relativePath.split('/');
      for (const part of relParts) {
        if (part === '..') baseParts.pop();
        else if (part !== '.') baseParts.push(part);
      }
      return baseParts.join('/');
  };

  const normalizeRootUrl = (baseUrl) => {
    return (baseUrl || '')
      .toString()
      .trim()
      .replace(/\/chat\/completions$/, '')
      .replace(/\/responses$/, '')
      .replace(/\/completions$/, '')
      .replace(/\/models$/, '')
      .replace(/\/v1$/, '')
      .replace(/\/api\/v0$/, '')
      .replace(/\/+$/, '');
  };

  const isDataUrlImage = (s) => typeof s === 'string' && s.startsWith('data:image');

  const sanitizeForLog = (name, content) => {
    try {
      if (isDataUrlImage(content)) {
        const len = content.length;
        const head = content.slice(0, 64);
        const tail = content.slice(-32);
        return `[Binary image data url: ${name} | length=${len} | head="${head}..." | tail="...${tail}"]`;
      }
      if (typeof content !== 'string') {
        return JSON.stringify(content, null, 2);
      }
      if (content.length > 250_000) {
        const head = content.slice(0, 120_000);
        const tail = content.slice(-40_000);
        return `${head}\n\n[...TRUNCATED ${content.length - head.length - tail.length} chars...]\n\n${tail}`;
      }
      return content;
    } catch {
      return String(content);
    }
  };

  const appendToFileHandle = async (fileHandle, text) => {
    if (!fileHandle) return;
    const file = await fileHandle.getFile();
    const writable = await fileHandle.createWritable({ keepExistingData: true });
    await writable.write({ type: 'write', position: file.size, data: text });
    await writable.close();
  };

  const ensureLogFile = async (dirHandle) => {
    if (!dirHandle) return null;
    const logDir = await dirHandle.getDirectoryHandle('.vibecode', { create: true });
    return await logDir.getFileHandle('session.log.txt', { create: true });
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text || ''], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'vibecode_log.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // --- FUZZY PATCHING LOGIC ---
  const findFuzzyLocation = (fileContent, searchBlock) => {
    if (!fileContent || !searchBlock) return null;
    const fileLines = fileContent.split('\n');
    const searchLines = searchBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (searchLines.length === 0) return null;

    const normalizedFile = fileLines.map((line, idx) => ({ 
        text: line.trim(), 
        idx 
    })).filter(l => l.text.length > 0);

    for (let i = 0; i <= normalizedFile.length - searchLines.length; i++) {
        let match = true;
        for (let j = 0; j < searchLines.length; j++) {
            if (normalizedFile[i + j].text !== searchLines[j]) {
                match = false;
                break;
            }
        }

        if (match) {
            const startLineIdx = normalizedFile[i].idx;
            const endLineIdx = normalizedFile[i + searchLines.length - 1].idx;
            
            let startIndex = 0;
            for (let k = 0; k < startLineIdx; k++) startIndex += fileLines[k].length + 1;

            let endIndex = 0;
            for (let k = 0; k <= endLineIdx; k++) endIndex += fileLines[k].length + 1;
            
            return { startIndex, endIndex: endIndex - 1 };
        }
    }
    return null;
  };

  const applyPatch = (originalContent, patchString) => {
    if (!originalContent) return patchString;
    const patchRegex = /^\s*(?:<{4,}|&lt;{4,}).*\n([\s\S]*?)\n\s*(?:={4,}|&equals;{4,}).*\n([\s\S]*?)\n\s*(?:>{4,}|&gt;{4,}).*/gm;
    
    let newContent = originalContent;
    let match;
    
    while ((match = patchRegex.exec(patchString)) !== null) {
      const [full, oldCode, replacementCode] = match;
      
      // 1. Exact match
      if (newContent.includes(oldCode)) {
        newContent = newContent.replace(oldCode, replacementCode);
        continue;
      }

      // 2. Trimmed match
      const trimmedOld = oldCode.trim();
      const trimmedNew = replacementCode.trim();
      if (newContent.includes(trimmedOld)) {
        newContent = newContent.replace(trimmedOld, trimmedNew);
        continue;
      }

      // 3. Fuzzy match
      const fuzzyLoc = findFuzzyLocation(newContent, oldCode);
      if (fuzzyLoc) {
        const before = newContent.slice(0, fuzzyLoc.startIndex);
        const after = newContent.slice(fuzzyLoc.endIndex);
        newContent = before + replacementCode + after;
        continue;
      }

      console.warn('Patch failed for block:', trimmedOld.slice(0, 50) + '...');
    }
    return newContent;
  };

  const detectPython = (text) => {
      if (!text || typeof text !== 'string') return false;
      const lower = text.toLowerCase();
      if (lower.includes('def main():')) return true;
      if (lower.includes('if __name__ == "__main__":')) return true;
      if (lower.includes('import pygame')) return true;
      if (lower.includes('pip install')) return true;
      
      const hasPythonWord = lower.includes('python');
      const hasImport = lower.includes('import ');
      const hasDef = lower.includes('def ');
      
      if (hasPythonWord && (hasImport || hasDef)) return true;
      return false;
  };

  const splitThinking = (raw) => {
    if (!raw) return { thinking: '', output: raw, thinkingOpen: false };
    
    // Robust regex to handle <think>, <thinking>, and variations
    const openMatch = raw.match(/<(?:thinking|think)>/i);
    
    if (!openMatch || typeof openMatch.index !== 'number') {
      return { thinking: '', output: raw, thinkingOpen: false };
    }

    const fullTag = openMatch[0];
    const tagName = fullTag.replace(/[<>]/g, ''); // 'think' or 'thinking'
    
    const openStart = openMatch.index;
    const realOpenEnd = openStart + fullTag.length;
    const afterOpen = raw.slice(realOpenEnd);

    // 1. Try explicit closing tag
    const closeRegex = new RegExp(`<\/${tagName}>`, 'i');
    const closeMatch = afterOpen.match(closeRegex);

    if (closeMatch && typeof closeMatch.index === 'number') {
        const closeStart = realOpenEnd + closeMatch.index;
        const closeEnd = closeStart + closeMatch[0].length;
        const thinking = raw.slice(realOpenEnd, closeStart);
        const output = (raw.slice(0, openStart) + raw.slice(closeEnd)).trimStart();
        return { thinking, output, thinkingOpen: false };
    }

    // 2. Try implicit exit via Code Fences (```)
    const fenceMatch = afterOpen.match(/(?:^|\n)\s*```/);
    if (fenceMatch && typeof fenceMatch.index === 'number') {
        const fenceStart = realOpenEnd + fenceMatch.index;
        const thinking = raw.slice(realOpenEnd, fenceStart);
        const output = (raw.slice(0, openStart) + raw.slice(fenceStart)).trimStart();
        return { thinking, output, thinkingOpen: false };
    }

    // 3. Try implicit exit via File Markers
    const implicitExit = afterOpen.match(/(?:^|\n)(?:<!--|\/\*+|\/\/+)\s*(?:filename|patch):/i);
    if (implicitExit && typeof implicitExit.index === 'number') {
         const implicitEndIndex = realOpenEnd + implicitExit.index;
         const thinking = raw.slice(realOpenEnd, implicitEndIndex);
         const output = (raw.slice(0, openStart) + raw.slice(implicitEndIndex)).trimStart();
         return { thinking, output, thinkingOpen: false };
    }

    const thinking = afterOpen;
    const prefix = raw.slice(0, openStart);
    return { thinking, output: prefix, thinkingOpen: true };
  };

  const hasEdits = (parsed) => {
    if (!parsed) return false;
    return (parsed.files && Object.keys(parsed.files).length > 0) ||
           (parsed.patches && Object.keys(parsed.patches).length > 0);
  };

  const stripInnerFences = (content) => {
      let c = (content || "").trim();
      c = c.replace(/^```[^\n]*\n/, "");
      c = c.replace(/\n```\s*$/, "");
      return c;
  };

  const Utils = {
    debounce,
    readAsDataURL,
    sanitizeForLog,
    ensureLogFile,
    appendToFileHandle,
    downloadText,
    detectPython,
    splitThinking,
    hasEdits,
    applyPatch,

    safeJsonParse: (str) => {
      try { return JSON.parse(str); } catch { return null; }
    },

    streamSSE: async (res, onEvent) => {
      if (!res || !res.body || !res.body.getReader) throw new Error('Streaming not supported.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw) continue;
          const lines = raw.split('\n');
          let event = '';
          const dataLines = [];
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          const data = dataLines.join('\n');
          const shouldStop = onEvent({ event, data });
          if (shouldStop === true) { try { await reader.cancel(); } catch (e) {} return; }
        }
      }
      const tail = buffer.trim();
      if (tail) {
        const lines = tail.split('\n');
        let event = '';
        const dataLines = [];
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        const data = dataLines.join('\n');
        if (data) { onEvent({ event, data }); }
      }
    },

    parseResponse: (text) => {
        const result = { files: {}, patches: {}, thought: null, usedFallback: false };
        if (!text || typeof text !== "string") return result;
        text = text.replace(/\r\n/g, "\n");

        const split = Utils.splitThinking(text);
        if (split.thinking) {
            result.thought = split.thinking.trim();
            text = split.output;
        }

        const parseMarkerLine = (line) => {
          const t = (line || "").trim();
          let m = t.match(/^<!--\s*(filename|patch)\s*:\s*([^\s>]+)(?:\s*-->|\s*$)/i);
          if (m) return { kind: m[1].toLowerCase(), name: m[2].trim() };
          
          m = t.match(/^\/\*+\s*(filename|patch)\s*:\s*([^\s*]+)(?:\s*\*\/|\s*$)/i);
          if (m) return { kind: m[1].toLowerCase(), name: m[2].trim() };
          
          m = t.match(/^\/\/+\s*(filename|patch)\s*:\s*([^\s]+)/i);
          if (m) return { kind: m[1].toLowerCase(), name: m[2].trim() };
          return null;
        };

        const parseLooseFileLabel = (line) => {
          const t = (line || "").trim();
          let m = t.match(/^<!--\s*([^\s]+?\.(?:html|css|js|mjs|json|md|txt|svg))\s*-->$/i);
          if (m) return { name: m[1].trim() };
          return null;
        };

        const textNoFences = text.replace(/^```[\s\S]*?\n/, "").replace(/\n```\s*$/, "");

        // PASS B: Strict Markers
        {
          const lines = textNoFences.split("\n");
          let current = null;
          let buf = [];
          const commit = () => {
            if (!current) return;
            let content = buf.join("\n").trim();
            content = stripInnerFences(content);
            content = content.replace(/^(?:<!--|\/\*+|\/\/+)\s*(?:filename|patch)\s*:\s*[^\n]+\n?/i, "");
            
            if (current.kind === "filename") result.files[current.name] = content;
            else result.patches[current.name] = content;
          };

          for (const line of lines) {
            const marker = parseMarkerLine(line);
            if (marker) {
              if (current) commit();
              current = marker;
              buf = [];
              continue;
            }
            if (current) buf.push(line);
          }
          if (current) commit();
        }

        if (Object.keys(result.files).length > 0 || Object.keys(result.patches).length > 0) return result;

        // PASS C: Loose Labels
        {
          const lines = textNoFences.split("\n");
          let current = null;
          let buf = [];
          const commit = () => {
            if (!current) return;
            let content = buf.join("\n").trim();
            content = stripInnerFences(content);
            if (content) result.files[current.name] = content;
          };
          for (const line of lines) {
            const label = parseLooseFileLabel(line);
            if (label) {
              if (current) commit();
              current = label;
              buf = [];
              continue;
            }
            if (current) buf.push(line);
          }
          if (current) commit();
        }

        if (Object.keys(result.files).length > 0 || Object.keys(result.patches).length > 0) return result;

        // Fallback: HTML Detection
        const htmlFallbackMatch = text.match(/<!DOCTYPE html|<html/i);
        if (htmlFallbackMatch && typeof htmlFallbackMatch.index === "number") {
          const idx = htmlFallbackMatch.index;
          result.files["index.html"] = text.slice(idx).trim();
          result.usedFallback = true;
        }

        return result;
    },

    extractHtmlReferences: (html) => {
        const scripts = [];
        const styles = [];
        if (!html || typeof html !== "string") return { scripts, styles };
        const addUnique = (arr, val) => { if (val && !arr.includes(val)) arr.push(val); };
        const scriptRe = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        let m;
        while ((m = scriptRe.exec(html))) addUnique(scripts, m[1]);
        const linkRe = /<link[^>]*href\s*=\s*["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
        while ((m = linkRe.exec(html))) addUnique(styles, m[1]);
        return { scripts, styles };
    },

    normalizeParsedOutput: (currentFiles, parsed) => {
        const warnings = [];
        const out = { ...parsed, files: { ...(parsed.files || {}) }, patches: { ...(parsed.patches || {}) } };
        const safeTrimEnd = (s) => String(s ?? "").replace(/\r\n/g, "\n").replace(/\s+$/g, "");
        
        const sanitizeFileContent = (filename, content) => {
          let c = stripInnerFences(content);
          return safeTrimEnd(c);
        };

        for (const [name, content] of Object.entries(out.files)) {
          out.files[name] = sanitizeFileContent(name, content);
        }

        const baseIndex = out.files["index.html"] || currentFiles["index.html"] || "";
        const refs = Utils.extractHtmlReferences(baseIndex);
        const referenced = new Set([...(refs.scripts || []), ...(refs.styles || [])]);
        
        const keepFiles = {};
        const variantCandidates = { "script.js": [], "styles.css": [] };
        const hasOrWillHaveBase = (base) => Object.prototype.hasOwnProperty.call(currentFiles, base) || Object.prototype.hasOwnProperty.call(out.files, base) || referenced.has(base);

        for (const [name, content] of Object.entries(out.files)) {
          if (Object.prototype.hasOwnProperty.call(currentFiles, name) || referenced.has(name)) {
            keepFiles[name] = content;
            continue;
          }
          const lower = name.toLowerCase();
          if (/^script\d+\.js$/.test(lower) && hasOrWillHaveBase("script.js")) {
            variantCandidates["script.js"].push({ name, content });
            continue;
          }
          if (/^styles\d+\.css$/.test(lower) && hasOrWillHaveBase("styles.css")) {
            variantCandidates["styles.css"].push({ name, content });
            continue;
          }
          warnings.push(`Ignored unreferenced new file: ${name}`);
        }

        for (const base of Object.keys(variantCandidates)) {
          const candidates = variantCandidates[base];
          if (!candidates || candidates.length === 0) continue;
          let best = candidates[0];
           for (const c of candidates) {
            if ((c.content || "").length >= (best.content || "").length) best = c;
          }
          if (best.name !== base) warnings.push(`Mapped ${best.name} -> ${base} (variant file not referenced).`);
          keepFiles[base] = best.content;
        }

        const keepPatches = {};
        for (const [name, patchList] of Object.entries(out.patches || {})) {
          if (Object.prototype.hasOwnProperty.call(currentFiles, name) || Object.prototype.hasOwnProperty.call(keepFiles, name) || referenced.has(name)) {
            keepPatches[name] = patchList;
          } else {
            warnings.push(`Ignored patch for unknown/unreferenced file: ${name}`);
          }
        }

        out.files = keepFiles;
        out.patches = keepPatches;
        out.warnings = warnings;
        return out;
    },

    applyPatchesToFiles: (currentFiles, patches) => {
      const updatedFiles = { ...currentFiles };
      for (const [filename, patchContent] of Object.entries(patches)) {
        if (updatedFiles[filename]) {
          updatedFiles[filename] = applyPatch(updatedFiles[filename], patchContent);
        }
      }
      return updatedFiles;
    },

    createPreviewSession: (files) => {
      const toRevoke = [];
      if (!files['index.html']) return { url: '', cleanup: () => {} };
      let html = files['index.html'];

      const resolveKey = (filename) => {
        if (!filename) return null;
        let clean = filename.split('?')[0];
        if (files[clean] != null) return clean;
        clean = clean.replace(/^\/+/, '');
        if (files[clean] != null) return clean;
        const parts = clean.split(/[\\/]/).filter(Boolean);
        const joined = parts.join('/');
        if (files[joined] != null) return joined;
        const base = parts[parts.length - 1];
        if (files[base] != null) return base;
        const found = Object.keys(files).find(k => k.endsWith(base));
        if (found) return found;
        return null;
      };

      html = html.replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (match, href) => {
          const key = resolveKey(href);
          return (key && files[key] != null) ? `<style>\n/* Inlined from ${href} */\n${files[key]}\n</style>` : match;
      });

      html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script>/gi, (match, before, src, after) => {
          const key = resolveKey(src);
          return (key && files[key] != null) ? `<script${before}${after}>\n// Inlined from ${src}\n${files[key]}\n</script>` : match;
      });

      html = html.replace(/<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
          if (src.startsWith('data:') || src.startsWith('http')) return match;
          const key = resolveKey(src);
          if (key && files[key] != null) {
              let content = files[key];
              if (!content.startsWith('data:') && (key.endsWith('.svg') || content.trim().startsWith('<svg'))) {
                  content = `data:image/svg+xml;base64,${btoa(content)}`;
              }
              return `<img${before}src="${content}"${after}>`;
          }
          return match;
      });

      html = html.replace(/<script\b[^>]*src=["'][^"']+\.(ts|tsx)["'][^>]*><\/script>/gi, '');

      // INJECTED SCRIPT FOR ERROR & CONSOLE LOG CAPTURE
      const errorScript = `
        <script>
          (function() {
            window.__VC_POINT_VIBE_ENABLED__ = false;
            
            function sendLog(type, args) {
              try {
                if (window.parent) {
                   window.parent.postMessage({ 
                      type: 'iframe-log', 
                      level: type,
                      message: Array.from(args).map(a => {
                        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e) { return String(a); }
                      }).join(' ')
                   }, '*');
                }
              } catch(e) {}
            }

            var originalLog = console.log;
            var originalWarn = console.warn;
            var originalError = console.error;
            var originalInfo = console.info;

            console.log = function() { originalLog.apply(console, arguments); sendLog('log', arguments); };
            console.warn = function() { originalWarn.apply(console, arguments); sendLog('warn', arguments); };
            console.error = function() { originalError.apply(console, arguments); sendLog('error', arguments); };
            console.info = function() { originalInfo.apply(console, arguments); sendLog('info', arguments); };

            window.addEventListener('message', function(event) { try { if (event.data.type === 'toggle-point-vibe') window.__VC_POINT_VIBE_ENABLED__ = !!event.data.enabled; } catch (e) {} });
            window.addEventListener('click', function(ev) {
              try {
                if (!window.__VC_POINT_VIBE_ENABLED__) return;
                var target = ev.target;
                if (!target) return;
                ev.preventDefault(); ev.stopPropagation();
                var rect = target.getBoundingClientRect();
                var payload = { type: 'iframe-point', tag: target.tagName || '', text: (target.innerText || target.textContent || '').slice(0, 200), classes: target.className || '', id: target.id || '', rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
                if (window.parent) window.parent.postMessage(payload, '*');
              } catch (e) {}
            }, true);
            window.onerror = function(message, source, lineno, colno, error) { 
                sendLog('error', [message, 'at', source, ':', lineno]);
            };
          })();
        </script>
      `;

      html = html.includes('</head>') ? html.replace('</head>', `${errorScript}\n</head>`) : errorScript + html;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      toRevoke.push(url);

      return { url, cleanup: () => { toRevoke.forEach(u => URL.revokeObjectURL(u)); } };
    },

    fetchModels: async (baseUrl) => {
      const root = normalizeRootUrl(baseUrl);
      try {
        const res = await fetch(`${root}/api/v0/models`);
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.models || data || [];
          const arr = Array.isArray(list) ? list : [];
          if (arr.length) return arr;
        }
      } catch {}
      try {
        const res = await fetch(`${root}/v1/models`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch { return []; }
    },

    getModelInfo: async (baseUrl, modelId) => {
      try {
        const root = normalizeRootUrl(baseUrl);
        const safeId = encodeURIComponent(modelId || '');
        const res = await fetch(`${root}/api/v0/models/${safeId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    },

    getDirHandle: async () => { try { return await window.showDirectoryPicker({ mode: 'readwrite' }); } catch { return null; } },

    readFiles: async (handle) => {
      const files = {};
      if (!handle) return files;
      const readEntry = async (entry, path = '') => {
          if (entry.kind === 'file') {
              const ext = entry.name.split('.').pop().toLowerCase();
              if (['html', 'css', 'js', 'mjs', 'json', 'md', 'txt', 'svg'].includes(ext)) {
                  const file = await entry.getFile();
                  files[path + entry.name] = await file.text();
              }
              else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'].includes(ext)) {
                  const file = await entry.getFile();
                  files[path + entry.name] = await readAsDataURL(file);
              }
          } else if (entry.kind === 'directory') {
              for await (const child of entry.values()) {
                  await readEntry(child, path + entry.name + '/');
              }
          }
      };
      for await (const entry of handle.values()) await readEntry(entry);
      return files;
    },

    saveFiles: async (handle, files) => {
      if (!handle) return;
      for (const [name, content] of Object.entries(files)) {
        try {
            const parts = name.split('/');
            const fileName = parts.pop();
            let currentDir = handle;
            for (const part of parts) currentDir = await currentDir.getDirectoryHandle(part, { create: true });
            const fh = await currentDir.getFileHandle(fileName, { create: true });
            const w = await fh.createWritable();
            if (content.startsWith('data:image')) {
                 const res = await fetch(content);
                 const blob = await res.blob();
                 await w.write(blob);
            } else {
                 await w.write(content);
            }
            await w.close();
        } catch (e) { console.error(`Failed to save ${name}:`, e); }
      }
    }
  };

  window.VC = window.VC || {};
  window.VC.Utils = Utils;
})();