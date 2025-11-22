(function() {
  
  // Helper: Normalize strings
  const normalize = (str) => str.replace(/\r\n/g, '\n').trim();

  // Helper: Debounce
  const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  // Helper: Read File as Data URL
  const readAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper: Path Resolution
  const resolvePath = (baseFile, relativePath) => {
      if (relativePath.startsWith('/')) return relativePath.slice(1);
      if (relativePath.startsWith('http') || relativePath.startsWith('data:')) return relativePath;

      const baseParts = baseFile.split('/');
      baseParts.pop(); // remove file

      const relParts = relativePath.split('/');
      for (const part of relParts) {
        if (part === '..') baseParts.pop();
        else if (part !== '.') baseParts.push(part);
      }
      return baseParts.join('/');
  };

  // Helper: Patchengine fuer "patch:" Bloecke
  const applyPatch = (originalContent, patchString) => {
    if (!originalContent) return patchString;

    const patchRegex = /<<<<\s*([\s\S]*?)\s*====\s*([\s\S]*?)\s*>>>>/g;
    let newContent = originalContent;
    let match;

    while ((match = patchRegex.exec(patchString)) !== null) {
      const [full, oldCode, newCode] = match;

      // 1. exakter Treffer
      if (newContent.includes(oldCode)) {
        newContent = newContent.replace(oldCode, newCode);
        continue;
      }

      // 2. getrimmter Block
      const trimmedOld = oldCode.trim();
      const trimmedNew = newCode.trim();

      const idx = newContent.indexOf(trimmedOld);
      if (idx !== -1) {
        newContent = newContent.replace(trimmedOld, trimmedNew);
      } else {
        console.warn('Patch failed for block:', trimmedOld.slice(0, 80) + '...');
      }
    }

    return newContent;
  };

  const Utils = {
    debounce,
    readAsDataURL,

    // --- PARSING DES LLM OUTPUTS ---
      parseResponse: (text) => {
      const result = { files: {}, patches: {}, thought: null, usedFallback: false };

      if (!text || typeof text !== "string") {
        return result;
      }

      // Newlines normalisieren
      text = text.replace(/\r\n/g, "\n");

      // optionaler <thinking> Block
      const thoughtMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
      if (thoughtMatch) {
        result.thought = thoughtMatch[1].trim();
        text = text.replace(thoughtMatch[0], "");
      }

      // Helper um ```lang ... ``` zu entfernen
      const stripCodeFence = (content) => {
        return content
          .replace(/^\s*```[a-zA-Z0-9]*\n?/, "")
          .replace(/```\s*$/, "");
      };

      // PASS 1: Strikte Marker  <!-- filename: name.ext -->  /  <!-- patch: name.ext -->
      const fileRegex =
        /(?:<!--|\/\*)\s*filename:\s*([^\s]+?)\s*(?:-->| \*\/)([\s\S]*?)(?=(?:<!--|\/\*)\s*(?:filename|patch):|$)/gi;
      let match;
      while ((match = fileRegex.exec(text)) !== null) {
        const filename = match[1].trim();
        let content = match[2].trim();
        content = stripCodeFence(content);
        result.files[filename] = content;
      }

      const patchRegex =
        /(?:<!--|\/\*)\s*patch:\s*([^\s]+?)\s*(?:-->| \*\/)([\s\S]*?)(?=(?:<!--|\/\*)\s*(?:filename|patch):|$)/gi;
      while ((match = patchRegex.exec(text)) !== null) {
        const filename = match[1].trim();
        let content = match[2].trim();
        content = stripCodeFence(content);
        result.patches[filename] = content;
      }

      if (
        Object.keys(result.files).length > 0 ||
        Object.keys(result.patches).length > 0
      ) {
        return result;
      }

      // PASS 2: Lockere Marker wie
      //   <!-- index.html -->
      //   <!-- styles.css -->
      //   // index.html
      //   // js/app.js
      //   /* components.js */
      const looseRegex =
        /(?:<!--|\/\*+|\/\/+)\s*([^\s]+?\.(?:html|css|js|json|md))\s*(?:-->| \*\/)?([\s\S]*?)(?=(?:<!--|\/\*+|\/\/+)\s*[^\s]+?\.(?:html|css|js|json|md)\s*(?:-->| \*\/)?|$)/gi;

      while ((match = looseRegex.exec(text)) !== null) {
        const filename = match[1].trim();
        let content = match[2].trim();
        content = stripCodeFence(content);
        if (content) {
          result.files[filename] = content;
        }
      }

      if (
        Object.keys(result.files).length > 0 ||
        Object.keys(result.patches).length > 0
      ) {
        return result;
      }

      // PASS 3: Code Fences wie ```html ... ```, ```css ... ```, ```javascript ... ```
      const fenceRegex = /```(\w+)?\n([\s\S]*?)```/g;
      const blocks = [];
      let fenceMatch;
      while ((fenceMatch = fenceRegex.exec(text)) !== null) {
        const lang = (fenceMatch[1] || "").toLowerCase();
        const code = fenceMatch[2];
        blocks.push({ lang, code });
      }

      const inferFilesFromFences = (fenceBlocks) => {
        const files = {};
        if (!fenceBlocks || fenceBlocks.length === 0) return files;

        // HTML Block finden
        let htmlIndex = -1;
        for (let i = 0; i < fenceBlocks.length; i++) {
          const b = fenceBlocks[i];
          if (b.lang === "html" || b.lang === "htm" || b.lang === "xml") {
            htmlIndex = i;
            break;
          }
          if (b.code.includes("<html") || b.code.includes("<!DOCTYPE html")) {
            htmlIndex = i;
            break;
          }
        }

        const htmlBlock = htmlIndex >= 0 ? fenceBlocks[htmlIndex] : null;
        let cssBlocks = [];
        let jsBlocks = [];

        fenceBlocks.forEach((b) => {
          if (b.lang === "css") cssBlocks.push(b);
          if (["js", "javascript", "jsx", "ts", "tsx"].includes(b.lang)) {
            jsBlocks.push(b);
          }
        });

        let cssNames = [];
        let jsNames = [];

        if (htmlBlock) {
          const htmlName = "index.html";
          const htmlCode = htmlBlock.code.trim();
          files[htmlName] = htmlCode;

          // Dateinamen aus <link href="...css"> und <script src="...js"> lesen
          const cssRegex = /href=["']([^"']+\.css)["']/gi;
          let m;
          while ((m = cssRegex.exec(htmlCode)) !== null) {
            cssNames.push(m[1]);
          }

          const jsRegex = /src=["']([^"']+\.js)["']/gi;
          while ((m = jsRegex.exec(htmlCode)) !== null) {
            jsNames.push(m[1]);
          }
        }

        // CSS Blocks zuordnen
        if (cssBlocks.length > 0) {
          if (cssNames.length > 0) {
            cssBlocks.forEach((b, idx) => {
              const name = cssNames[idx] || cssNames[cssNames.length - 1];
              files[name] = b.code.trim();
            });
          } else if (cssBlocks.length === 1) {
            files["styles.css"] = cssBlocks[0].code.trim();
          } else {
            cssBlocks.forEach((b, idx) => {
              const suffix = idx === 0 ? "" : String(idx + 1);
              files[`styles${suffix}.css`] = b.code.trim();
            });
          }
        }

        // JS Blocks zuordnen
        if (jsBlocks.length > 0) {
          if (jsNames.length > 0) {
            jsBlocks.forEach((b, idx) => {
              const name = jsNames[idx] || jsNames[jsNames.length - 1];
              files[name] = b.code.trim();
            });
          } else if (jsBlocks.length === 1) {
            files["script.js"] = jsBlocks[0].code.trim();
          } else {
            jsBlocks.forEach((b, idx) => {
              const suffix = idx === 0 ? "" : String(idx + 1);
              files[`script${suffix}.js`] = b.code.trim();
            });
          }
        }

        return files;
      };

      if (blocks.length > 0) {
        const filesFromFences = inferFilesFromFences(blocks);
        if (Object.keys(filesFromFences).length > 0) {
          Object.assign(result.files, filesFromFences);
          return result;
        }
      }

      // Fallback: reines HTML ohne Marker / Fences
      if (
        Object.keys(result.files).length === 0 &&
        Object.keys(result.patches).length === 0
      ) {
        const htmlFallbackMatch = text.match(/<!DOCTYPE html|<html/i);
        if (
          htmlFallbackMatch &&
          typeof htmlFallbackMatch.index === "number"
        ) {
          const idx = htmlFallbackMatch.index;
          result.files["index.html"] = text.slice(idx).trim();
          result.usedFallback = true;
        }
      }

      return result;
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

    // --- PREVIEW GENERATION: baut ein eigenstaendiges HTML mit inline JS/CSS/IMAGES ---
    createPreviewSession: (files) => {
      const toRevoke = [];

      if (!files['index.html']) {
        return { url: '', cleanup: () => {} };
      }

      let html = files['index.html'];

      const resolveKey = (filename) => {
        if (!filename) return null;
        let clean = filename.split('?')[0]; // Remove query params

        if (files[clean] != null) return clean;

        clean = clean.replace(/^\/+/, ''); // Remove leading slash
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

      // 1. CSS Links inline einbetten (verhindert FOUC und behandelt externe Links korrekt)
      html = html.replace(
        /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
        (match, href) => {
          const key = resolveKey(href);
          if (key && files[key] != null) {
            return `<style>\n/* Inlined from ${href} */\n${files[key]}\n</style>`;
          }
          // Return original match if local file not found (keeps CDN links intact)
          return match;
        }
      );

      // 2. Script src Tags umschreiben: Inlining statt Blob URLs fuer maximale Kompatibilitaet
      html = html.replace(
        /<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script>/gi,
        (match, before, src, after, inner) => {
          const key = resolveKey(src);
          if (key && files[key] != null) {
             // Inhalt direkt in den Script-Tag schreiben und src-Attribut entfernen
             // Dies funktioniert zuverlässiger als Blob-URLs im Sandbox-Iframe
             return `<script${before}${after}>\n// Inlined from ${src}\n${files[key]}\n</script>`;
          }
          return match;
        }
      );

      // 3. Images inline einbetten
      html = html.replace(
        /<img\b([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
        (match, before, src, after) => {
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
        }
      );

      // TS / TSX entfernen
      html = html.replace(
        /<script\b[^>]*src=["'][^"']+\.(ts|tsx)["'][^>]*><\/script>/gi,
        ''
      );

      // Fehler und Point & Vibe Bridge + Console Capture
      const errorScript = `
        <script>
          (function() {
            window.__VC_POINT_VIBE_ENABLED__ = false;
            
            // Console Proxy
            var originalLog = console.log;
            var originalError = console.error;
            
            console.error = function() {
                var args = Array.from(arguments);
                originalError.apply(console, args);
                try {
                    if (window.parent) {
                        window.parent.postMessage({
                            type: 'iframe-error',
                            message: args.map(String).join(' '),
                            source: 'console'
                        }, '*');
                    }
                } catch(e) {}
            };

            window.addEventListener('message', function(event) {
              try {
                if (!event || !event.data || typeof event.data !== 'object') return;
                if (event.data.type === 'toggle-point-vibe') {
                  window.__VC_POINT_VIBE_ENABLED__ = !!event.data.enabled;
                }
              } catch (e) {}
            });

            window.addEventListener('click', function(ev) {
              try {
                if (!window.__VC_POINT_VIBE_ENABLED__) return;
                var target = ev.target;
                if (!target) return;

                ev.preventDefault();
                ev.stopPropagation();

                var rect = target.getBoundingClientRect();
                var payload = {
                  type: 'iframe-point',
                  tag: target.tagName || '',
                  text: (target.innerText || target.textContent || '').slice(0, 200),
                  classes: target.className || '',
                  id: target.id || '',
                  rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                };

                if (window.parent) {
                  window.parent.postMessage(payload, '*');
                }
              } catch (e) {}
            }, true);

            window.onerror = function(message, source, lineno, colno, error) {
              try {
                if (window.parent) {
                  window.parent.postMessage(
                    { type: 'iframe-error', message: message, source: source, line: lineno, column: colno },
                    '*'
                  );
                }
              } catch (e) {}
            };
          })();
        </script>
      `;

      if (html.includes('</head>')) {
        html = html.replace('</head>', `${errorScript}\n</head>`);
      } else {
        html = errorScript + html;
      }

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      toRevoke.push(url);

      return {
        url,
        cleanup: () => {
          toRevoke.forEach(u => URL.revokeObjectURL(u));
        }
      };
    },

    // --- API UND IO ---
    fetchModels: async (baseUrl) => {
      try {
        const url = baseUrl
          .replace(/\/chat\/completions$/, '')
          .replace(/\/v1$/, '')
          .replace(/\/$/, '');
        const res = await fetch(`${url}/v1/models`);
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },

    getDirHandle: async () => {
      try {
        return await window.showDirectoryPicker({ mode: 'readwrite' });
      } catch {
        return null;
      }
    },

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

      for await (const entry of handle.values()) {
          await readEntry(entry);
      }

      return files;
    },

    saveFiles: async (handle, files) => {
      if (!handle) return;
      
      for (const [name, content] of Object.entries(files)) {
        try {
            const parts = name.split('/');
            const fileName = parts.pop();
            let currentDir = handle;

            for (const part of parts) {
                currentDir = await currentDir.getDirectoryHandle(part, { create: true });
            }

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
        } catch (e) {
          console.error(`Failed to save ${name}:`, e);
        }
      }
    }
  };

  window.VC = window.VC || {};
  window.VC.Utils = Utils;
})();