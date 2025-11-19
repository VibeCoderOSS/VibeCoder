// js/utils.js
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

  // Helper: Path Resolution (wird an anderen Stellen genutzt)
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

    // --- PARSING DES LLM OUTPUTS ---
    parseResponse: (text) => {
      const result = { files: {}, patches: {}, thought: null };

      // optionaler <thinking> Block
      const thoughtMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
      if (thoughtMatch) {
        result.thought = thoughtMatch[1].trim();
        text = text.replace(thoughtMatch[0], '');
      }

      // Vollstaendige Dateien: <!-- filename: name.ext -->
      const fileRegex = /(?:<!--|\/\*)\s*filename:\s*([^\s]+?)\s*(?:-->|\*\/)([\s\S]*?)(?=(?:<!--|\/\*)\s*(?:filename|patch):|$)/gi;
      let match;
      while ((match = fileRegex.exec(text)) !== null) {
        const filename = match[1].trim();
        let content = match[2].trim();
        content = content.replace(/^\s*```[a-zA-Z0-9]*\n?/, '').replace(/```\s*$/, '');
        result.files[filename] = content;
      }

      // Patches: <!-- patch: name.ext -->
      const patchRegex = /(?:<!--|\/\*)\s*patch:\s*([^\s]+?)\s*(?:-->|\*\/)([\s\S]*?)(?=(?:<!--|\/\*)\s*(?:filename|patch):|$)/gi;
      while ((match = patchRegex.exec(text)) !== null) {
        const filename = match[1].trim();
        let content = match[2].trim();
        content = content.replace(/^\s*```[a-zA-Z0-9]*\n?/, '').replace(/```\s*$/, '');
        result.patches[filename] = content;
      }

      // Fallback: reines HTML ohne Marker
      if (Object.keys(result.files).length === 0 &&
          Object.keys(result.patches).length === 0 &&
          !result.thought) {
        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          result.files['index.html'] = text.trim();
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

    // --- PREVIEW GENERATION: baut ein eigenstaendiges HTML mit inline JS/CSS ---
    createPreviewSession: (files) => {
      const toRevoke = [];

      if (!files['index.html']) {
        return { url: '', cleanup: () => {} };
      }

      let html = files['index.html'];

      const resolveKey = (filename) => {
        if (!filename) return null;
        let clean = filename.split('?')[0];

        // direkter Name
        if (files[clean] != null) return clean;

        // fuehrende Slashes weg
        clean = clean.replace(/^\/+/, '');
        if (files[clean] != null) return clean;

        // normalisierter Pfad
        const parts = clean.split(/[\\/]/).filter(Boolean);
        const joined = parts.join('/');
        if (files[joined] != null) return joined;

        // Dateiname als Fallback
        const base = parts[parts.length - 1];
        if (files[base] != null) return base;

        return null;
      };

      // CSS Links inline einbetten
      html = html.replace(
        /<link\b[^>]+href=["']([^"']+\.css)["'][^>]*>/gi,
        (match, href) => {
          const key = resolveKey(href);
          if (key && files[key] != null) {
            return `<style>\n/* Inlined from ${href} */\n${files[key]}\n</style>`;
          }
          return match;
        }
      );

      // JS Skripte inline einbetten
      html = html.replace(
        /<script\b([^>]*?)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi,
        (match, before, src, after) => {
          const key = resolveKey(src);
          if (key && files[key] != null) {
            return `<script${before}${after}>\n// Inlined from ${src}\n${files[key]}\n</script>`;
          }
          return match;
        }
      );

      // TS / TSX Skripte fuer die statische Preview entfernen
      html = html.replace(
        /<script\b[^>]*src=["'][^"']+\.(ts|tsx)["'][^>]*><\/script>/gi,
        ''
      );

      // Fehlerbruecke in die Parent App
      const errorScript = `
        <script>
          window.onerror = function(message, source, lineno, colno, error) {
            try {
              if (window.parent) {
                window.parent.postMessage(
                  { type: 'iframe-error', message, source, line: lineno, column: colno },
                  '*'
                );
              }
            } catch (e) {}
          };
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

      for await (const entry of handle.values()) {
        if (entry.kind === 'file' &&
            /\.(html|css|js|mjs|json|md|txt|svg|png|jpg|jpeg)$/.test(entry.name)) {
          const file = await entry.getFile();
          files[entry.name] = await file.text();
        }
      }

      return files;
    },

    saveFiles: async (handle, files) => {
      if (!handle) return;
      for (const [name, content] of Object.entries(files)) {
        try {
          const flatName = name.split('/').pop();
          const fh = await handle.getFileHandle(flatName, { create: true });
          const w = await fh.createWritable();
          await w.write(content);
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
