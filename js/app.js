(function() {
  const html = htm.bind(React.createElement);
  const { useState, useEffect, useRef, useCallback } = React;
  const { Styles, Icon, SettingsModal, StatusBar, CodePreview, HistoryModal } = window.VC.Components;
  const Utils = window.VC.Utils;

  // --- SETUP SCREEN ---
  const SetupScreen = ({ settings, onSave, onSelectDir }) => {
    const [local, setLocal] = useState(settings);
    const [models, setModels] = useState([]);
    
    useEffect(() => {
        Utils.fetchModels(local.apiUrl).then(m => {
            setModels(m);

            if (m.length) {
                setLocal(prev => {
                    const ids = m.map(mod => mod.id);

                    // Falls noch kein Modell gesetzt ist oder der Platzhalter nicht existiert:
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
                  <button onClick=${() => onSave(local)} className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium text-gray-400 border border-gray-700 hover:border-gray-600 transition">
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
    const [settings, setSettings] = useState({
      apiUrl: 'http://localhost:1234/v1',
      model: 'local-model',
      mode: 'auto', // auto | rewrite | patch
      temperature: 0.7,
      maxTokens: 32000
    });

    const [setupDone, setSetupDone] = useState(false);
    const [dirHandle, setDirHandle] = useState(null);
    const [files, setFiles] = useState({});
    const [messages, setMessages] = useState([{ role: 'assistant', content: 'Ready to vibe. What are we building?' }]);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState([]); // { name, data, path, saveToProject: boolean }
    
    // Detailed Status State
    const [appStatus, setAppStatus] = useState('idle'); // idle, reading, thinking, generating, patching
    const [statusMsg, setStatusMsg] = useState('');
    const [viewMode, setViewMode] = useState('preview');
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    
    const [streamText, setStreamText] = useState('');
    const [runtimeError, setRuntimeError] = useState(null);
    const [activeFile, setActiveFile] = useState('index.html');
    const [pointEvents, setPointEvents] = useState([]); 

    // Version History & Modification Tracking
    const [history, setHistory] = useState([]); // Array of { files, timestamp, prompt }
    const [currentVersionIndex, setCurrentVersionIndex] = useState(-1); // -1 means latest (working copy)
    const [modifiedFiles, setModifiedFiles] = useState([]);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const msgsEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    // Track if user is at bottom using a Ref to avoid closure staleness and layout thrashing issues
    const isAtBottomRef = useRef(true);
    
    const abortControllerRef = useRef(null);
    
    // Refs for safe async operations
    const filesRef = useRef(files);
    const dirHandleRef = useRef(dirHandle);

    useEffect(() => { filesRef.current = files; }, [files]);
    useEffect(() => { dirHandleRef.current = dirHandle; }, [dirHandle]);

    // --- SMART AUTO-SCROLLING ---
    
    // 1. Always scroll to bottom when a new message is added or status changes
    useEffect(() => { 
        // Force bottom stickiness on new message start
        isAtBottomRef.current = true;
        msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages.length, appStatus]);

    // 2. Only scroll during streaming if the user WAS at the bottom before the update
    useEffect(() => {
        if (isAtBottomRef.current) {
             // Use 'auto' instead of 'smooth' during streaming to prevent "fighting" the user's scroll
             msgsEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        }
    }, [streamText]);

    // 3. Track scroll position during scrolling
    const handleChatScroll = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        const { scrollHeight, scrollTop, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Update sticky state based on current position
        // Tolerance of 40px allows for minor pixel differences
        const isNearBottom = distanceFromBottom < 40;
        isAtBottomRef.current = isNearBottom;

        setShowScrollButton(!isNearBottom);
    };
    
    // Handle iframe runtime errors und Point Events
    useEffect(() => {
        const handler = (e) => { 
            if (e.data?.type === 'iframe-error') {
                console.error("Preview Error:", e.data.message);
                setRuntimeError(e.data.message); 
            }
            if (e.data?.type === 'iframe-point') {
                setPointEvents(prev => {
                    const next = [
                      ...prev,
                      {
                        tag: e.data.tag,
                        text: e.data.text,
                        classes: e.data.classes,
                        id: e.data.id,
                        rect: e.data.rect
                      }
                    ];
                    return next.slice(-6);
                });
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // --- ROBUST DEBOUNCED AUTO-SAVE ---
    const saveTimerRef = useRef(null);

    useEffect(() => {
        if (!dirHandle) return;
        
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            const currentFiles = filesRef.current;
            const currentHandle = dirHandleRef.current;
            
            if (Object.keys(currentFiles).length > 0 && currentHandle) {
                Utils.saveFiles(currentHandle, currentFiles);
            }
        }, 1000);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [files, dirHandle]);


    useEffect(() => {
        if (!files[activeFile] && Object.keys(files).length) setActiveFile(Object.keys(files)[0]);
    }, [files, activeFile]);

    const getSystemPrompt = () => `
You are VibeCoder, an expert frontend engineer.
You generate strictly valid HTML/JS/CSS. No .tsx, no .ts, no Markdown explanations outside of comments.

ARCHITECTURE:
- Entry point: index.html
- PREFER separating logic into 'script.js' and styles into 'styles.css' (or 'app.js'/'app.css') for clean architecture.
- Do NOT dump complex logic into index.html unless it is a very simple single-file prototype.
- Use standard ES6 Modules (<script type="module">) if beneficial.

CURRENT MODE: ${settings.mode.toUpperCase()}
${settings.mode === 'rewrite' ? 'ALWAYS REWRITE FULL FILES.' : 
  settings.mode === 'patch' ? 'ALWAYS USE PATCHES FOR EXISTING FILES.' : 
  'DECIDE: Use PATCH for small changes (<20 lines). Use FULL FILE for new files or complex refactors.'}

ASSETS & IMAGES:
- If the user attaches images, they are ALREADY SAVED in the file system.
- Look for "AVAILABLE ASSETS" in the user message.
- Use the provided paths (e.g., "assets/image.png") directly in your code: <img src="assets/image.png">.
- Do NOT use placeholders like "https://via.placeholder.com" if an asset is provided.

OUTPUT FORMATS:

1. <thinking>...</thinking>
   (Explain your plan. Decide between PATCH or REWRITE.)

2. <!-- filename: path/to/file.ext -->
   (Followed by full file content. Use this for NEW files or REWRITES.)

3. <!-- patch: path/to/file.ext -->
   <<<<
   (Exact code block to replace - must match file content character-by-character including whitespace)
   ====
   (New code block)
   >>>>

RULES:
- Do not use \`npm\` or \`import\` from node_modules. Use CDNs (React, Tailwind) if requested.
- For patches, the '<<<<' block must be UNIQUE in the file. Include 2-3 lines of context.
- If you are unsure about the context for a patch, REWRITE the file.
`;


    const handleFileSelect = async (e) => {
        const selected = Array.from(e.target.files);
        if (!selected.length) return;

        const newAttachments = await Promise.all(selected.map(async f => {
            // Auto suggest assets/ folder for images
            const isImage = f.type.startsWith('image/');
            const defaultPath = isImage ? `assets/${f.name}` : f.name;

            return {
                name: f.name,
                type: f.type,
                data: await Utils.readAsDataURL(f),
                path: defaultPath, 
                saveToProject: true // Default to saving files
            };
        }));
        
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    const toggleAttachmentSave = (index) => {
        setAttachments(prev => prev.map((a, i) => i === index ? { ...a, saveToProject: !a.saveToProject } : a));
    };

    const updateAttachmentPath = (index, newPath) => {
        setAttachments(prev => prev.map((a, i) => i === index ? { ...a, path: newPath } : a));
    };

    const removeAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const removePoint = (index) => {
        setPointEvents(prev => prev.filter((_, i) => i !== index));
    };

    const clearPoints = () => {
        setPointEvents([]);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setAppStatus('idle');
            setStatusMsg('Stopped by user');
            setStreamText(prev => prev + '\n[Stopped by user]');
        }
    };
    
    const handleRestoreHistory = (index) => {
        const entry = history[index];
        if (entry) {
            setFiles(entry.files);
            setModifiedFiles([]);
            setMessages(prev => [...prev, { role: 'assistant', content: `Restored version from ${new Date(entry.timestamp).toLocaleTimeString()}` }]);
        }
    };

    const handleSend = async () => {
      // If generating, stop instead
      if (appStatus !== 'idle') {
          handleStop();
          return;
      }

      if ((!input.trim() && !attachments.length)) return;
      
      // SNAPSHOT HISTORY BEFORE CHANGES
      if (Object.keys(files).length > 0) {
         setHistory(prev => [...prev, { 
             timestamp: Date.now(), 
             files: JSON.parse(JSON.stringify(files)), 
             prompt: input || "Upload" 
         }]);
         setCurrentVersionIndex(history.length); // point to new entry
      }
      
      // 1. Process Attachments und speichern ins Projekt
      const newFiles = {};
      const assetNotices = [];
      
      attachments.forEach(att => {
          if (att.saveToProject) {
              newFiles[att.path] = att.data;
              assetNotices.push(att.path);
          }
      });
      
      // Update file state sofort
      if (Object.keys(newFiles).length > 0) {
          setFiles(prev => ({ ...prev, ...newFiles }));
      }

      // 2. Construct Message
      let userContent;
      let promptSuffix = "";

      if (assetNotices.length > 0) {
          promptSuffix = `\n\nAVAILABLE ASSETS:\nI have added the following files to your project structure. You MUST use these paths in your code:\n${assetNotices.map(p => `- ${p}`).join('\n')}`;
      }

      // Wenn Bilder da sind, multimodales Format
      if (attachments.length > 0) {
          userContent = [
              { type: "text", text: (input || "Analyze these images and update the project.") + promptSuffix }
          ];
          attachments.forEach(att => {
              userContent.push({
                  type: "image_url",
                  image_url: { url: att.data }
              });
          });
      } else {
          userContent = input + promptSuffix;
      }

      const userMsg = { role: 'user', content: userContent };
      
      // Anzeige im Chat
      const displayMsg = { 
          role: 'user', 
          content: (input || '[Images Uploaded]') + (assetNotices.length ? `\n\n[+ Added ${assetNotices.length} assets]` : '')
      }; 
      
      const newMsgs = [...messages, displayMsg];
      setMessages(newMsgs);
      
      setInput('');
      setAttachments([]);
      setStreamText('');
      
      setAppStatus('reading');
      setStatusMsg('Reading context...');

      // Kontext erstellen, grosse Binaerdaten rauslassen
      const contextFiles = Object.entries({ ...files, ...newFiles }).map(([n, c]) => {
          if (n.match(/\.(png|jpg|jpeg|gif|webp|ico)$/i) && c.length > 500) return `<!-- filename: ${n} -->\n[Binary Image Data Available at ${n}]`;
          return `<!-- filename: ${n} -->\n${c}`;
      }).join('\n\n');
      
      let contextString = `CURRENT FILES:\n${contextFiles}\n\nUSER REQUEST: ${input}`;
      
      if (runtimeError) {
        contextString += `\n\n!!! DETECTED RUNTIME ERROR IN PREVIEW !!!\nError: ${runtimeError}\nPLEASE FIX THIS ERROR.`;
      }

      if (pointEvents.length) {
        contextString += `\n\nPOINT & VIBE SELECTIONS:\n` + pointEvents.map((p, idx) => {
          const safeText = (p.text || '').replace(/\s+/g, ' ').slice(0, 140);
          const safeClasses = (p.classes || '').toString().replace(/\s+/g, ' ').slice(0, 140);
          const safeTag = (p.tag || '').toLowerCase();
          return `#${idx + 1}: tag=<${safeTag}> id="${p.id || ''}" class="${safeClasses}" text="${safeText}"`;
        }).join('\n');
      }

      // Real API Messages
      const apiMsgs = [
          { role: 'system', content: getSystemPrompt() },
          { role: 'system', content: contextString },
          // nur letzte einfache Messages
          ...messages.slice(-6).filter(m => typeof m.content === 'string'), 
          userMsg
      ];

      setRuntimeError(null);

      // Setup AbortController
      abortControllerRef.current = new AbortController();

      try {
        setAppStatus('thinking');
        setStatusMsg('Contacting model...');

        const cleanUrl = settings.apiUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '').replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: settings.model, 
                messages: apiMsgs, 
                stream: true, 
                temperature: settings.temperature, 
                max_tokens: settings.maxTokens 
            }),
            signal: abortControllerRef.current.signal
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isThinking = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6));
                        const delta = json.choices[0]?.delta?.content || '';
                        fullText += delta;
                        
                        if (fullText.includes('<thinking>') && !fullText.includes('</thinking>')) {
                            isThinking = true;
                            const thinkPart = fullText.split('<thinking>')[1];
                            setAppStatus('thinking');
                            setStatusMsg(thinkPart.slice(-50)); 
                        } else if (fullText.includes('</thinking>')) {
                            isThinking = false;
                            setAppStatus('generating');
                            setStatusMsg('Writing code...');
                        }

                        if (!isThinking) {
                           const visibleText = fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trimStart();
                           setStreamText(visibleText);
                        }
                    } catch {}
                }
            }
        }

        setAppStatus('patching');
        setStatusMsg('Applying changes...');

        // Parse results
        const parsed = Utils.parseResponse(fullText);
        
        let nextFiles = Utils.applyPatchesToFiles({ ...files, ...newFiles }, parsed.patches);
        nextFiles = { ...nextFiles, ...parsed.files };
        
        // Identify modified files
        const changes = [];
        Object.keys(nextFiles).forEach(key => {
            if (files[key] !== nextFiles[key]) changes.push(key);
        });
        setModifiedFiles(changes);

        if (Object.keys(nextFiles).length > 0) {
            setFiles(nextFiles);
            setViewMode('preview');
        }
        
        let finalMsgContent = parsed.thought 
            ? `**Plan:** ${parsed.thought}\n\n${fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()}`
            : fullText;

        if (parsed.usedFallback) {
            finalMsgContent += "\n\n⚠️ **Note:** The model output was unstructured. I applied a fallback parser to extract the code (assumed `index.html`).";
        }

        setMessages(prev => [...prev, { role: 'assistant', content: finalMsgContent }]);

      } catch (e) {
        if (e.name === 'AbortError') {
             // gestoppt
        } else {
            console.error(e);
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
        }
      } finally {
        setAppStatus('idle');
        setStatusMsg('');
        abortControllerRef.current = null;
      }
    };

    if (!setupDone) return html`<${Styles} /><${SetupScreen} settings=${settings} onSave=${s => { setSettings(s); setSetupDone(true); }} onSelectDir=${async () => {
        const h = await Utils.getDirHandle();
        if(h) {
            setDirHandle(h);
            const fs = await Utils.readFiles(h);
            if(Object.keys(fs).length) setFiles(fs);
            return h;
        }
        return null;
    }} />`;

    return html`
      <${Styles} />
      <div className="flex w-screen h-screen text-gray-200 font-sans overflow-hidden bg-gray-950">
        
        <!-- SIDEBAR -->
        <div className="w-[400px] flex flex-col border-r border-gray-800 bg-gray-950 z-10 shadow-xl flex-shrink-0 relative">
           <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-full liquid-orb"></div>
                 <h1 className="font-bold text-lg tracking-tight text-white flex items-baseline gap-2">
                  <span>VibeCoder</span>
                  <span className="text-xs italic text-gray-400">OSS</span>
                  </h1>
              </div>
              <button onClick=${() => setShowSettings(true)} className="text-gray-500 hover:text-white transition"><${Icon} name="Settings" /></button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref=${chatContainerRef} onScroll=${handleChatScroll}>
              ${messages.map((m, i) => html`
                 <div key=${i} className=${`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className=${`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                        m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-900 border border-gray-800 text-gray-300 rounded-bl-none'
                    }`}>
                        ${m.role === 'assistant' && m.content.startsWith('**Plan:**') 
                            ? html`
                                <div className="mb-2 pb-2 border-b border-gray-700 text-gray-400 text-xs font-mono">
                                    ${m.content.split('\n\n')[0]}
                                </div>
                                <div>${m.content.split('\n\n').slice(1).join('\n\n')}</div>
                              ` 
                            : m.content}
                    </div>
                 </div>
              `)}
              ${streamText && html`
                 <div className="flex flex-col items-start w-full">
                    <div className="w-[90%] rounded-xl px-4 py-3 text-xs bg-gray-900 border border-purple-900/50 text-gray-400 font-mono whitespace-pre-wrap break-words border-l-2 border-purple-500 animate-pulse">
                       ${streamText}
                    </div>
                 </div>
              `}
              <div ref=${msgsEndRef}></div>
           </div>
           
           <!-- Floating Scroll Button -->
           ${showScrollButton && html`
              <button 
                  onClick=${() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                  className="absolute bottom-[220px] right-6 p-2 bg-gray-800 border border-gray-700 text-white rounded-full shadow-lg shadow-black/50 hover:bg-gray-700 transition z-20"
                  title="Scroll to Bottom"
              >
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
           `}

           <!-- STATUS BAR AREA -->
           <div className="bg-gray-950 border-t border-gray-800">
              <${StatusBar} status=${appStatus} message=${statusMsg} />
              
              <div className="p-4 relative">
                 <!-- Attachments List -->
                 ${attachments.length > 0 && html`
                    <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto custom-scrollbar">
                        ${attachments.map((att, i) => html`
                            <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 p-2 rounded-lg group">
                                <div className="w-12 h-12 flex-shrink-0 bg-gray-800 rounded overflow-hidden border border-gray-700">
                                   <img src=${att.data} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2 mb-1">
                                      <input 
                                         type="text" 
                                         value=${att.path} 
                                         onChange=${e => updateAttachmentPath(i, e.target.value)}
                                         className="bg-gray-950 text-xs text-green-400 border border-gray-700 rounded px-1 py-0.5 w-full focus:border-green-500 outline-none font-mono"
                                         placeholder="Path (e.g., assets/img.png)"
                                      />
                                   </div>
                                   <div 
                                       className=${`text-[10px] cursor-pointer select-none ${att.saveToProject ? 'text-blue-400' : 'text-gray-500'}`} 
                                       onClick=${() => toggleAttachmentSave(i)}
                                   >
                                       ${att.saveToProject ? '✓ Will save to project' : '○ Context only (Temporary)'}
                                   </div>
                                </div>
                                <button onClick=${() => removeAttachment(i)} className="text-gray-500 hover:text-red-400 p-1 transition"><${Icon} name="Close" size=${14} /></button>
                            </div>
                        `)}
                    </div>
                 `}

                 <!-- Point & Vibe Chips -->
                 ${pointEvents.length > 0 && html`
                    <div className="mb-3 flex flex-wrap gap-2 items-center text-[10px] text-gray-400">
                       <span className="uppercase tracking-wide font-semibold text-gray-500">Point & Vibe</span>
                       ${pointEvents.map((p, idx) => html`
                          <div key=${idx} className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-950/40 border border-purple-700/60">
                             <span className="text-purple-300 font-mono">#${idx + 1}</span>
                             <span className="font-mono text-gray-300">&lt;${(p.tag || '').toLowerCase()}&gt;</span>
                             ${p.text && html`<span className="max-w-[140px] truncate text-gray-400">"${p.text}"</span>`}
                             <button className="ml-1 text-gray-500 hover:text-red-300" onClick=${() => removePoint(idx)}>
                               <${Icon} name="Close" size=${10} />
                             </button>
                          </div>
                       `)}
                       <button className="ml-auto text-gray-500 hover:text-gray-200 underline decoration-dotted" onClick=${clearPoints}>Reset</button>
                    </div>
                 `}

                 ${runtimeError && html`
                    <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2 cursor-pointer hover:bg-red-900/30 transition" onClick=${() => setInput(`Fix error: ${runtimeError}`)}>
                       <${Icon} name="Alert" size=${14} />
                       <span className="font-bold">Error:</span> ${runtimeError}
                       <span className="ml-auto text-red-400 underline text-[10px]">FIX</span>
                    </div>
                 `}
                 <div className="relative group flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-xl p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition">
                    <input 
                        type="file" 
                        id="file-upload" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange=${handleFileSelect}
                    />
                    <label for="file-upload" className="p-2 text-gray-500 hover:text-blue-400 cursor-pointer transition" title="Attach Image">
                        <${Icon} name="Image" />
                    </label>

                    <textarea 
                       value=${input} 
                       onInput=${e => setInput(e.target.value)} 
                       onKeyDown=${e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                       className="flex-1 bg-transparent text-sm outline-none resize-none text-gray-200 max-h-32 py-2" 
                       rows=${1}
                       style=${{minHeight: '24px'}} 
                       placeholder="Ask to change something..." 
                    />
                    <button 
                        onClick=${handleSend} 
                        disabled=${(!input.trim() && !attachments.length) && appStatus === 'idle'} 
                        className=${`p-2 rounded-lg shadow-lg transition flex-shrink-0 ${
                            appStatus !== 'idle' 
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' 
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                    >
                       <${Icon} name=${appStatus !== 'idle' ? 'Stop' : 'Send'} />
                    </button>
                 </div>
              </div>
           </div>
        </div>

        <!-- MAIN CONTENT / PREVIEW -->
        <div className="flex-1 flex flex-col overflow-hidden relative border-l border-gray-800">
           <div className="h-1 bg-gradient-to-r from-purple-600/50 to-blue-600/50 absolute top-0 left-0 right-0 z-10"></div>
           <${CodePreview} 
              files=${files} 
              activeFile=${activeFile} 
              setActiveFile=${setActiveFile} 
              viewMode=${viewMode} 
              setViewMode=${setViewMode} 
              onFileChange=${(f, c) => setFiles({...files, [f]: c})} 
              modifiedFiles=${modifiedFiles}
              onOpenHistory=${() => setShowHistory(true)}
           />
        </div>

        <${SettingsModal} 
           isOpen=${showSettings} 
           onClose=${() => setShowSettings(false)} 
           settings=${settings} 
           onSave=${s => setSettings(s)} 
           systemPromptPreview=${getSystemPrompt()}
        />

        <${HistoryModal}
            isOpen=${showHistory}
            onClose=${() => setShowHistory(false)}
            history=${history}
            currentVersionIndex=${currentVersionIndex}
            onRestore=${handleRestoreHistory}
        />
      </div>
    `;
  };

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
})();