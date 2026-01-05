(function() {
  const html = htm.bind(React.createElement);
  const { useState, useEffect, useRef, useCallback } = React;
  
  if (!window.VC || !window.VC.Utils || !window.VC.Components) {
     const msg = "Initialization Failed: Missing dependencies (VC.Utils or VC.Components). Please check console for script errors.";
     console.error(msg);
     document.body.innerHTML = `<div style="color:#ef4444;padding:2rem;font-family:sans-serif;background:#0f0f12;height:100vh;"><h1>Fatal Error</h1><p>${msg}</p></div>`;
     return;
  }

  const { Styles, Icon, SettingsModal, StatusBar, ChatMessage, LogsModal, CodePreview, HistoryModal } = window.VC.Components;
  const Utils = window.VC.Utils;

  // --- DEFAULT TEMPLATE FOR VIRTUAL MODE ---
  const DEFAULT_TEMPLATE = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VibeCoder Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>✨ Ready to Vibe</h1>
      <p>Your virtual environment is set up.</p>
      <button id="btn">Click me</button>
    </div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    'styles.css': `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #0f0f12;
  color: #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.card {
  background: #1e1e24;
  padding: 2rem;
  border-radius: 1rem;
  border: 1px solid #2d2d35;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

h1 {
  background: linear-gradient(135deg, #a855f7, #3b82f6);
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 0.5rem;
}

p { color: #94a3b8; margin-bottom: 1.5rem; }

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

button:hover { background: #2563eb; transform: translateY(-1px); }
button:active { transform: translateY(1px); }`,
    'script.js': `document.getElementById('btn').addEventListener('click', () => {
  const btn = document.getElementById('btn');
  btn.textContent = 'Vibe Checked ✅';
  if (typeof confetti !== 'undefined') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  } else {
    alert('Vibe Checked! ✅');
  }
});`
  };

  // --- SETUP SCREEN ---
  const SetupScreen = ({ settings, onSave, onSelectDir, onVirtual }) => {
    const [local, setLocal] = useState(settings);
    const [models, setModels] = useState([]);
    
    useEffect(() => {
        Utils.fetchModels(local.apiUrl).then(m => {
            setModels(m);
            if (m.length) {
                setLocal(prev => {
                    const ids = m.map(mod => mod.id);
                    if (!prev.model || !ids.includes(prev.model)) {
                        return { ...prev, model: m[0].id };
                    }
                    return prev;
                });
            }
        });
    }, [local.apiUrl]);

    return html`
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950 text-white z-50">
         <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="h-1 bg-gradient-to-r from-purple-600 to-blue-600"></div>
            <div className="p-8 text-center">
               <div className="w-16 h-16 rounded-full liquid-orb mx-auto mb-6 shadow-[0_0_30px_rgba(168,85,247,0.3)]"></div>
               <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">VibeCoder</h1>
               <p className="text-gray-500 text-sm mb-8">Local AI. No Build Steps. Just Vibe.</p>

               <div className="space-y-4 text-left">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-semibold">Select Model</label>
                    <select value=${local.model} onChange=${e => setLocal({...local, model: e.target.value})} className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg p-3 text-gray-200 outline-none focus:border-purple-500 transition">
                       ${models.length ? models.map(m => html`<option value=${m.id}>${m.id}</option>`) : html`<option value="local-model">local-model</option>`}
                    </select>
                  </div>
                  <button onClick=${async () => {
                    const handle = await onSelectDir();
                    if (handle) onSave(local);
                  }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition transform active:scale-95">
                    <${Icon} name="Folder" /> Open Project Folder
                  </button>
                  <button onClick=${() => onVirtual(local)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-gray-400 border border-gray-700 hover:border-gray-600 transition">
                    Use Virtual Filesystem
                  </button>
               </div>
            </div>
         </div>
      </div>
    `;
  };

  // --- MAIN APP ---
  const App = () => {
    const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
    const [settings, setSettings] = useState({
      apiUrl: 'http://localhost:1234/v1',
      model: 'local-model',
      mode: 'auto', 
      temperature: null, // Default to null (Use Model Default)
    });

    const [setupDone, setSetupDone] = useState(false);
    const [dirHandle, setDirHandle] = useState(null);
    const [files, setFiles] = useState({});
    const [messages, setMessages] = useState([{ id: makeId(), role: 'assistant', content: 'Ready to vibe. What are we building?', output: 'Ready to vibe. What are we building?', thinking: '', isStreaming: false }]);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]); 
    
    const [appStatus, setAppStatus] = useState('idle');
    const [statusMsg, setStatusMsg] = useState('');
    const [viewMode, setViewMode] = useState('preview');
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const [logs, setLogs] = useState([]);
    
    // Session Logging
    const [sessionLogText, setSessionLogText] = useState('');
    const [sessionLogFileName, setSessionLogFileName] = useState('');
    const sessionLogRef = useRef('');
    const sessionLogFileHandleRef = useRef(null);
    const sessionLogWriteChainRef = useRef(Promise.resolve());
    const sessionLogUiFlushRef = useRef(null);

    const appendSessionLog = useCallback((tag, payload, level = 'INFO') => {
        const ts = new Date().toISOString();
        let body = '';
        try {
            if (payload == null) body = '';
            else if (typeof payload === 'string') body = payload;
            else body = JSON.stringify(payload, null, 2);
        } catch (e) {
            body = String(payload);
        }

        const entry = `\n\n===== ${ts} [${String(level).toUpperCase()}] ${String(tag || 'event')} =====\n${body}\n`;
        sessionLogRef.current += entry;

        if (!sessionLogUiFlushRef.current) {
            sessionLogUiFlushRef.current = setTimeout(() => {
                setSessionLogText(sessionLogRef.current);
                sessionLogUiFlushRef.current = null;
            }, 150);
        }

        const fh = sessionLogFileHandleRef.current;
        if (fh) {
            sessionLogWriteChainRef.current = sessionLogWriteChainRef.current
              .then(() => Utils.appendToFileHandle(fh, entry))
              .catch(() => {});
        }
    }, [Utils]);

    const log = useCallback((level, message, data = null) => {
        const entry = {
            ts: Date.now(),
            level: (level || 'info').toLowerCase(),
            message: String(message || ''),
            data
        };
        setLogs(prev => {
            const next = [...prev, entry];
            return next.slice(-500);
        });
    }, []);

    const copyLogs = useCallback(async () => {
        try {
            const lines = (logs || []).map(l => `[${new Date(l.ts || Date.now()).toISOString()}] ${l.level.toUpperCase()}: ${l.message}`);
            await navigator.clipboard.writeText(lines.join('\n'));
            log('info', 'Logs copied to clipboard');
        } catch (e) {
            log('error', 'Failed to copy logs', { error: String(e) });
        }
    }, [logs]);

    const copySessionLog = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(sessionLogRef.current || '');
        log('info', 'Session log copied to clipboard');
      } catch (e) {
        log('error', 'Failed to copy session log', { error: String(e) });
      }
    }, [log]);

    const downloadSessionLog = useCallback(() => {
      try {
        const name = sessionLogFileName || `vibecode_session_log_${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;
        Utils.downloadText(name, sessionLogRef.current || '');
        log('info', 'Session log download started');
      } catch (e) {
        log('error', 'Failed to download session log', { error: String(e) });
      }
    }, [Utils, sessionLogFileName, log]);


    const [runtimeError, setRuntimeError] = useState(null);
    const [activeFile, setActiveFile] = useState('index.html');
    const [pointEvents, setPointEvents] = useState([]); 

    const [history, setHistory] = useState([]); 
    const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
    const [modifiedFiles, setModifiedFiles] = useState([]);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const msgsEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const isAtBottomRef = useRef(true);
    
    const abortControllerRef = useRef(null);
    const activeAssistantMsgIdRef = useRef(null);
    
    const filesRef = useRef(files);
    const dirHandleRef = useRef(dirHandle);

    useEffect(() => { filesRef.current = files; }, [files]);
    useEffect(() => { dirHandleRef.current = dirHandle; }, [dirHandle]);

    // Scroll Logic
    useEffect(() => { 
        isAtBottomRef.current = true;
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages.length, appStatus]);

    useEffect(() => {
        if (isAtBottomRef.current) {
            msgsEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [messages]);

    const handleChatScroll = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        const { scrollHeight, scrollTop, clientHeight } = container;
        const isNearBottom = (scrollHeight - scrollTop - clientHeight) < 40;
        isAtBottomRef.current = isNearBottom;
        setShowScrollButton(!isNearBottom);
    };
    
    // Preview Error Handling
    useEffect(() => {
        const handler = (e) => { 
            if (e.data?.type === 'iframe-error') {
                console.error("Preview Error:", e.data.message);
                setRuntimeError(e.data.message); 
                appendSessionLog('preview.iframe_error', { message: e.data.message }).catch(() => {});
            }
            if (e.data?.type === 'iframe-point') {
                setPointEvents(prev => {
                    const next = [...prev, { tag: e.data.tag, text: e.data.text, classes: e.data.classes, id: e.data.id, rect: e.data.rect }];
                    return next.slice(-6);
                });
                appendSessionLog('preview.point', e.data).catch(() => {});
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [appendSessionLog]);

    // Auto-Save
    const saveTimerRef = useRef(null);
    useEffect(() => {
        if (!dirHandle) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            const currentFiles = filesRef.current;
            const currentHandle = dirHandleRef.current;
            if (Object.keys(currentFiles).length > 0 && currentHandle) {
                appendSessionLog('autosave.start', { fileCount: Object.keys(currentFiles).length });
                Utils.saveFiles(currentHandle, currentFiles)
                  .then(() => appendSessionLog('autosave.success', { ok: true }))
                  .catch((err) => appendSessionLog('autosave.error', { message: err?.message || String(err) }));
            }
        }, 1000);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [files, dirHandle, appendSessionLog]);

    useEffect(() => {
        if (!files[activeFile] && Object.keys(files).length) setActiveFile(Object.keys(files)[0]);
    }, [files, activeFile]);

    // --- HARDENED SYSTEM PROMPT ---
    const getSystemPrompt = (isRetry = false) => {
        let base = `You are VibeCoder, a Senior Frontend Engineer.
You build self-contained, browser-based webapps.

CORE RULES:
1. **No Build Steps**: Do not use npm, webpack, or require(). Use ES Modules or plain <script> tags.
2. **Libraries**: Use CDN links (unpkg, esm.sh, cdnjs) for libraries (React, Three.js, Tailwind, etc.).
3. **Robustness**: Verify variable scope and initialization. Avoid "undefined" errors in game loops.
4. **File Accuracy**: Use exact filenames from the context (e.g. 'script.js' not 'js/script.js').

CONTEXT & MEMORY:
The current state of all project files is provided to you below. 
You MUST read the existing code before generating new code.
DO NOT hallucinate variables that do not exist in the provided files.

THINKING & PLANNING:
Before coding, you MUST Plan in a <thinking> block.
- Analyze the user request.
- Check existing variables (is 'gameLoop' global? is 'canvas' defined?).
- Plan specific code changes to avoid breaking existing logic.

OUTPUT FORMATS:

1. <thinking>
   (Plan your changes here. Check scope and logic.)
   </thinking>

2. <!-- filename: path/to/file.ext -->
   (Full file content - Use this for new files or major rewrites)
   DO NOT indent the file marker. It must be at the start of the line.

3. <!-- patch: path/to/file.ext -->
   <<<<
   (Original Code Block - Must be UNIQUE and match exactly, including whitespace)
   ====
   (New Code Block - The complete replacement)
   >>>>

   PATCHING RULES:
   - Provide 3-5 lines of unchanged context *around* the change.
   - Do NOT omit code in the "New Code Block" (no "..."). Write the full replacement logic.
   - If a function is buggy, replace the WHOLE function, not just one line.
`;
        if (isRetry) {
             base += `\n\nCRITICAL RETRY INSTRUCTION:
Your previous output was invalid (detected Python or unstructured text).
You MUST output a browser web app (index.html, styles.css, script.js) with strict file markers.
NO PYTHON. NO MARKDOWN FENCES.`;
        }
        return base;
    };

    const handleFileSelect = async (e) => {
        const selected = Array.from(e.target.files);
        if (!selected.length) return;
        const newAttachments = await Promise.all(selected.map(async f => {
            const isImage = f.type.startsWith('image/');
            return {
                name: f.name,
                type: f.type,
                data: await Utils.readAsDataURL(f),
                path: isImage ? `assets/${f.name}` : f.name, 
                saveToProject: true
            };
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const toggleAttachmentSave = (index) => setAttachments(prev => prev.map((a, i) => i === index ? { ...a, saveToProject: !a.saveToProject } : a));
    const updateAttachmentPath = (index, newPath) => setAttachments(prev => prev.map((a, i) => i === index ? { ...a, path: newPath } : a));
    const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index));
    const removePoint = (index) => setPointEvents(prev => prev.filter((_, i) => i !== index));
    const clearPoints = () => setPointEvents([]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            try { abortControllerRef.current.abort(); } catch {}
            abortControllerRef.current = null;
        }
        const activeId = activeAssistantMsgIdRef.current;
        if (activeId) {
            setMessages(prev => prev.map(m => m.id !== activeId ? m : { ...m, isStreaming: false, content: (m.content || '') + '\n[Stopped by user]' }));
            activeAssistantMsgIdRef.current = null;
        }
        setAppStatus('idle');
        setStatusMsg('Stopped by user');
        log('info', 'User aborted generation');
    };

    const handleRestoreHistory = (index) => {
        const entry = history[index];
        if (entry) {
            setFiles(entry.files);
            setModifiedFiles([]);
            setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: `Restored version from ${new Date(entry.timestamp).toLocaleTimeString()}`, thinking: '', isStreaming: false }]);
        }
    };

    const isExcluded = (path) => {
        if (path.startsWith('.vibecode/') || path.includes('/.vibecode/')) return true;
        if (path.startsWith('.git/') || path.includes('/.git/')) return true;
        if (path.includes('node_modules/')) return true;
        if (path.endsWith('.log')) return true;
        if (path.endsWith('.txt')) return true; 
        return false;
    };

    const handleSend = async () => {
      if (appStatus !== 'idle') { handleStop(); return; }
      if ((!input.trim() && !attachments.length)) return;

      const userText = input;
      const userMsgId = makeId();
      const assistantMsgId = makeId();
      activeAssistantMsgIdRef.current = assistantMsgId;

      try {
        await appendSessionLog('user.input', { text: userText || '', attachments: attachments.map(a => a.name) });
      } catch {}

      if (Object.keys(files).length > 0) {
         setHistory(prev => [...prev, { timestamp: Date.now(), files: JSON.parse(JSON.stringify(files)), prompt: input || "Upload" }]);
         setCurrentVersionIndex(history.length);
      }

      const newFiles = {};
      const assetNotices = [];
      attachments.forEach(att => {
          if (att.saveToProject) {
              newFiles[att.path] = att.data;
              assetNotices.push(att.path);
          }
      });
      if (Object.keys(newFiles).length > 0) setFiles(prev => ({ ...prev, ...newFiles }));

      // Setup Messages
      let userContent;
      let promptSuffix = assetNotices.length > 0 ? `\n\nAVAILABLE ASSETS:\n${assetNotices.map(p => `- ${p}`).join('\n')}` : "";

      if (attachments.length > 0) {
          userContent = [{ type: "text", text: (input || "Analyze images.") + promptSuffix }];
          attachments.forEach(att => userContent.push({ type: "image_url", image_url: { url: att.data } }));
      } else {
          userContent = (input || '') + promptSuffix;
      }

      const displayUserText = (input || '[Images Uploaded]') + (assetNotices.length ? `\n[+ Added ${assetNotices.length} assets]` : '');
      
      setMessages(prev => ([
        ...prev,
        { id: userMsgId, role: 'user', content: displayUserText, thinking: '', isStreaming: false },
        { id: assistantMsgId, role: 'assistant', content: '', output: '', thinking: '', isStreaming: true }
      ]));

      setInput('');
      setAttachments([]);
      setRuntimeError(null);
      
      setAppStatus('loading');
      setStatusMsg('Initializing...');

      // Context Construction
      const mergedFiles = { ...files, ...newFiles };
      const contextFilesList = [];
      const contextFiles = Object.entries(mergedFiles)
          .filter(([n]) => !isExcluded(n))
          .map(([n, c]) => {
              contextFilesList.push(n);
              if (n.match(/\.(png|jpg|jpeg|gif|webp|ico)$/i) && typeof c === 'string' && c.length > 500) {
                  return `<!-- filename: ${n} -->\n[Binary Image Data Available at ${n}]`;
              }
              return `<!-- filename: ${n} -->\n${c}`;
          }).join('\n\n');

      let contextString = `PROJECT CONTEXT (CURRENT FILES):\n${contextFiles}\n\nUSER REQUEST: ${userText}`;
      if (runtimeError) contextString += `\n\n!!! DETECTED RUNTIME ERROR IN PREVIEW !!!\nError: ${runtimeError}\nPLEASE FIX THIS ERROR.`;
      if (pointEvents.length) contextString += `\n\nPOINT & VIBE SELECTIONS:\n` + pointEvents.map((p, idx) => `#${idx + 1}: tag=<${p.tag}> text="${(p.text||'').slice(0,50)}"`).join('\n');

      await appendSessionLog('request.context_files', contextFilesList);
      
      const cleanUrl = (settings.apiUrl || '').replace(/\/chat\/completions$/, '').replace(/\/responses$/, '').replace(/\/v1$/, '').replace(/\/$/, '');
      const canUseResponses = attachments.length === 0;

      // Recursive Execution Function for Retry
      const executeRun = async (retryAttempt = false) => {
          const sysPrompt = getSystemPrompt(retryAttempt);
          const temp = settings.temperature; // User has full control
          const endpoint = canUseResponses ? `${cleanUrl}/v1/responses` : `${cleanUrl}/v1/chat/completions`;

          const recentChat = messages
            .slice(-6)
            .filter(m => m.role === 'user')
            .slice(-3)
            .map(m => `USER: ${m.content}`)
            .join('\n\n');

          let payload = {};
          let payloadMode = '';

          if (!canUseResponses) {
              payloadMode = 'messages_standard';
              payload = {
                  model: settings.model,
                  messages: [
                      { role: 'system', content: sysPrompt },
                      { role: 'system', content: contextString },
                      ...messages.slice(-6).map(m => ({ role: m.role, content: m.content || '' })),
                      { role: 'user', content: userContent }
                  ],
                  stream: true
                  // Temperature added optionally below
              };
          } else {
              const inputString = `${contextString}\n\nRECENT CHAT:\n${recentChat}\n\nUSER REQUEST:\n${userText || ''}`;
              payloadMode = 'instructions_input_string';
              const strictInput = `SYSTEM:\n${sysPrompt}\n\n${inputString}`;
              
              payload = {
                  model: settings.model,
                  instructions: sysPrompt,
                  input: strictInput,
                  stream: true
                  // Temperature added optionally below
              };
          }

          // Only explicitly set temperature if it is defined (not null)
          // This allows the backend (LM Studio) to use its own default/preset if 'temperature' is omitted.
          if (typeof temp === 'number') {
              payload.temperature = temp;
          }

          await appendSessionLog('request.start', { endpoint, payloadMode, retryAttempt, temp });
          
          abortControllerRef.current = new AbortController();
          
          // Unified Streaming Logic
          let rawContent = '';
          let explicitThinking = '';
          let outputText = '';
          let reasoningText = '';

          const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
              signal: abortControllerRef.current.signal
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

          await Utils.streamSSE(res, ({ event, data }) => {
              if (!data || data === '[DONE]') return;
              const json = Utils.safeJsonParse(data);
              if (!json) return;

              let deltaContent = '';
              let deltaThinking = '';

              // Universal Parsing
              if (json.choices?.[0]?.delta?.content) deltaContent = json.choices[0].delta.content;
              else if (json.type === 'response.output_text.delta' || json.type === 'response.output_text.delta') deltaContent = json.delta;
              else if (json.type === 'response.reasoning_text.delta' || json.type === 'response.reasoning.delta') deltaThinking = json.delta;
              else if (typeof json.delta === 'string') deltaContent = json.delta; 

              // Unpack objects
              if (typeof deltaContent === 'object' && deltaContent.text) deltaContent = deltaContent.text;
              if (typeof deltaThinking === 'object' && deltaThinking.text) deltaThinking = deltaThinking.text;

              if (deltaContent) {
                  rawContent += deltaContent;
              }
              if (deltaThinking) {
                  explicitThinking += deltaThinking;
              }

              // Always check content for embedded thinking tags (Robustness for Qwen/Chat models)
              const split = Utils.splitThinking(rawContent);
              
              // Effective Thinking = Explicit Events + Extracted Tags
              reasoningText = explicitThinking + split.thinking;
              
              // Effective Output = Cleaned Content
              outputText = split.output;

              // Update UI
              setMessages(prev => prev.map(m => {
                  if (m.id !== assistantMsgId) return m;
                  return {
                      ...m,
                      thinking: reasoningText,
                      output: outputText,
                      content: outputText,
                      isStreaming: true
                  };
              }));

              if (reasoningText && !outputText.trim()) {
                  setAppStatus('thinking');
                  setStatusMsg(reasoningText.slice(-60));
              } else {
                  setAppStatus('generating');
                  setStatusMsg('Writing code...');
              }
          });

          const finalRaw = rawContent;
          const finalOutput = outputText || rawContent; // Fallback if split fails completely

          // Python Detection Logic
          const isPython = Utils.detectPython(finalRaw);
          const isUnstructured = !Utils.hasEdits(Utils.parseResponse(finalOutput));

          await appendSessionLog('model.complete', { 
              rawLen: finalRaw.length, 
              isPython, 
              isUnstructured, 
              retryAttempt 
          });

          if (isPython && !retryAttempt) {
              log('warn', 'Python detected in output. Triggering Retry.');
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, output: 'Invalid output detected (Python). Retrying...', isStreaming: true } : m));
              await new Promise(r => setTimeout(r, 500)); 
              return executeRun(true);
          }

          if (isPython && retryAttempt) {
              log('error', 'Retry failed. Python still present.');
              throw new Error("Model insists on generating Python despite retry instructions.");
          }

          if (isUnstructured && !isPython) {
              log('warn', 'Response unstructured but not Python. Proceeding with best-effort parse.');
          }

          // Proceed to Parsing
          setAppStatus('patching');
          setStatusMsg('Applying changes...');

          const parsedRaw = Utils.parseResponse(finalOutput);
          const parsed = Utils.normalizeParsedOutput({ ...mergedFiles }, parsedRaw);

          (parsed.warnings || []).forEach(w => log('warn', w));
          
          if (!Utils.hasEdits(parsed)) {
               log('warn', 'No structured edits found.');
          }

          let nextFiles = Utils.applyPatchesToFiles({ ...mergedFiles }, parsed.patches || {});
          nextFiles = { ...nextFiles, ...(parsed.files || {}) };

          const changes = [];
          Object.keys(nextFiles).forEach(key => {
              if (mergedFiles[key] !== nextFiles[key]) changes.push(key);
          });
          setModifiedFiles(changes);

          await appendSessionLog('files.changed', changes);

          if (Object.keys(nextFiles).length > 0 && changes.length > 0) {
              setFiles(nextFiles);
              setViewMode('preview');
              log('info', 'Applied edits', { changedFiles: changes });
          } else {
              log('info', 'No file changes to apply');
          }
      };

      try {
          await executeRun(false);
      } catch (e) {
          if (e?.name === 'AbortError') {
              log('info', 'Request aborted');
          } else {
              console.error(e);
              log('error', 'Request failed', { message: e.message });
              setMessages(prev => prev.map(m => m.id !== assistantMsgId ? m : { ...m, isStreaming: false, content: (m.content || '') + `\nError: ${e.message}` }));
          }
      } finally {
          setAppStatus('idle');
          setStatusMsg('');
          abortControllerRef.current = null;
          activeAssistantMsgIdRef.current = null;
      }
    };

    if (!setupDone) return html`<${Styles} /><${SetupScreen} settings=${settings} onSave=${s => { setSettings(s); setSetupDone(true); }} onVirtual=${s => { setSettings(s); setFiles(DEFAULT_TEMPLATE); setSetupDone(true); }} onSelectDir=${async () => { const h = await Utils.getDirHandle(); if(h) { setDirHandle(h); const fs = await Utils.readFiles(h); if(Object.keys(fs).length) setFiles(fs); return h; } return null; }} />`;

    return html`
      <${Styles} />
      <div className="flex w-screen h-screen text-gray-200 font-sans overflow-hidden bg-gray-950">
        <div className="w-[400px] flex flex-col border-r border-gray-800 bg-gray-950 z-10 shadow-xl flex-shrink-0 relative">
           <div className="h-1 bg-gradient-to-r from-purple-600 to-blue-600"></div>
           <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-full liquid-orb"></div>
                 <h1 className="font-bold text-lg tracking-tight text-white flex items-baseline gap-2"><span>VibeCoder</span><span className="text-xs italic text-gray-400">OSS</span></h1>
              </div>
              <button onClick=${() => setShowSettings(true)} className="text-gray-500 hover:text-white transition"><${Icon} name="Settings" /></button>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref=${chatContainerRef} onScroll=${handleChatScroll}>
              ${messages.map(m => html`<${ChatMessage} key=${m.id} msg=${m} />`)}
              <div ref=${msgsEndRef}></div>
           </div>
           ${showScrollButton && html`<button onClick=${() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-[220px] right-6 p-2 bg-gray-800 border border-gray-700 text-white rounded-full shadow-lg shadow-black/50 hover:bg-gray-700 transition z-20"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></button>`}
           <div className="bg-gray-950 border-t border-gray-800">
              <${StatusBar} status=${appStatus} message=${statusMsg} />
              <div className="p-4 relative">
                 ${attachments.length > 0 && html`<div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto custom-scrollbar">${attachments.map((att, i) => html`<div className="flex items-center gap-3 bg-gray-900 border border-gray-800 p-2 rounded-lg group"><div className="w-12 h-12 flex-shrink-0 bg-gray-800 rounded overflow-hidden border border-gray-700"><img src=${att.data} className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><input type="text" value=${att.path} onChange=${e => updateAttachmentPath(i, e.target.value)} className="bg-gray-950 text-xs text-green-400 border border-gray-700 rounded px-1 py-0.5 w-full focus:border-green-500 outline-none font-mono" /></div><div className="text-[10px] cursor-pointer select-none ${att.saveToProject ? 'text-blue-400' : 'text-gray-500'}" onClick=${() => toggleAttachmentSave(i)}>${att.saveToProject ? '✓ Will save' : '○ Context only'}</div></div><button onClick=${() => removeAttachment(i)} className="text-gray-500 hover:text-red-400 p-1"><${Icon} name="Close" size=${14} /></button></div>`)}</div>`}
                 ${pointEvents.length > 0 && html`<div className="mb-3 flex flex-wrap gap-2 items-center text-[10px] text-gray-400"><span className="uppercase tracking-wide font-semibold text-gray-500">Point & Vibe</span>${pointEvents.map((p, idx) => html`<div key=${idx} className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-950/40 border border-purple-700/60"><span className="text-purple-300 font-mono">#${idx + 1}</span><span className="font-mono text-gray-300">&lt;${(p.tag || '').toLowerCase()}&gt;</span><button className="ml-1 text-gray-500 hover:text-red-300" onClick=${() => removePoint(idx)}><${Icon} name="Close" size=${10} /></button></div>`)}<button className="ml-auto text-gray-500 hover:text-gray-200 underline decoration-dotted" onClick=${clearPoints}>Reset</button></div>`}
                 <div className="relative group flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-xl p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition">
                    <input type="file" id="file-upload" multiple accept="image/*" className="hidden" onChange=${handleFileSelect} />
                    <label for="file-upload" className="p-2 text-gray-500 hover:text-blue-400 cursor-pointer transition" title="Attach Image"><${Icon} name="Image" /></label>
                    <textarea value=${input} onInput=${e => setInput(e.target.value)} onKeyDown=${e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} className="flex-1 bg-transparent text-sm outline-none resize-none text-gray-200 max-h-32 py-2" rows=${1} style=${{minHeight: '24px'}} placeholder="Ask to change something..." />
                    <button onClick=${handleSend} disabled=${(!input.trim() && !attachments.length) && appStatus === 'idle'} className=${`p-2 rounded-lg shadow-lg transition flex-shrink-0 ${appStatus !== 'idle' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}><${Icon} name=${appStatus !== 'idle' ? 'Stop' : 'Send'} /></button>
                 </div>
              </div>
           </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden relative border-l border-gray-800">
           <div className="h-1 bg-gradient-to-r from-purple-600/50 to-blue-600/50 absolute top-0 left-0 right-0 z-10"></div>
           <${CodePreview} files=${files} activeFile=${activeFile} setActiveFile=${setActiveFile} viewMode=${viewMode} setViewMode=${setViewMode} onFileChange=${(f, c) => setFiles({...files, [f]: c})} modifiedFiles=${modifiedFiles} onOpenHistory=${() => setShowHistory(true)} onOpenLogs=${() => setShowLogs(true)} />
        </div>
        <${SettingsModal} isOpen=${showSettings} onClose=${() => setShowSettings(false)} settings=${settings} onSave=${s => setSettings(s)} systemPromptPreview=${getSystemPrompt()} />
        <${HistoryModal} isOpen=${showHistory} onClose=${() => setShowHistory(false)} history=${history} currentVersionIndex=${currentVersionIndex} onRestore=${handleRestoreHistory} />
        <${LogsModal} isOpen=${showLogs} onClose=${() => setShowLogs(false)} logs=${logs} onClear=${() => setLogs([])} onCopy=${copyLogs} sessionLogText=${sessionLogText} sessionLogFileName=${sessionLogFileName} onCopySessionLog=${copySessionLog} onDownloadSessionLog=${downloadSessionLog} />
      </div>
    `;
  };

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
})();