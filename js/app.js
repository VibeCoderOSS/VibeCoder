
// js/app.js
(function() {
  const html = htm.bind(React.createElement);
  const { useState, useEffect, useRef, useCallback } = React;
  const { Styles, Icon, SettingsModal, StatusBar, CodePreview } = window.VC.Components;
  const Utils = window.VC.Utils;

  // --- SETUP SCREEN ---
  const SetupScreen = ({ settings, onSave, onSelectDir }) => {
    const [local, setLocal] = useState(settings);
    const [models, setModels] = useState([]);
    
    useEffect(() => { Utils.fetchModels(local.apiUrl).then(setModels); }, []);

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
      mode: 'auto' // auto | rewrite | patch
    });

    const [setupDone, setSetupDone] = useState(false);
    const [dirHandle, setDirHandle] = useState(null);
    const [files, setFiles] = useState({});
    const [messages, setMessages] = useState([{ role: 'assistant', content: 'Ready to vibe. What are we building?' }]);
    const [input, setInput] = useState('');
    
    // Detailed Status State
    const [appStatus, setAppStatus] = useState('idle'); // idle, reading, thinking, generating, patching
    const [statusMsg, setStatusMsg] = useState('');
    const [viewMode, setViewMode] = useState('preview');
    const [showSettings, setShowSettings] = useState(false);
    const [streamText, setStreamText] = useState('');
    const [runtimeError, setRuntimeError] = useState(null);
    const [activeFile, setActiveFile] = useState('index.html');

    const msgsEndRef = useRef(null);
    
    // Refs for safe async operations
    const filesRef = useRef(files);
    const dirHandleRef = useRef(dirHandle);

    useEffect(() => { filesRef.current = files; }, [files]);
    useEffect(() => { dirHandleRef.current = dirHandle; }, [dirHandle]);

    useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamText, appStatus]);
    
    // Handle iframe runtime errors
    useEffect(() => {
        const handler = (e) => { 
            if (e.data?.type === 'iframe-error') {
                console.error("Preview Error:", e.data.message);
                setRuntimeError(e.data.message); 
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // --- ROBUST DEBOUNCED AUTO-SAVE ---
    // Uses a specific ref to track the save timer to prevent stale closure issues
    const saveTimerRef = useRef(null);

    useEffect(() => {
        if (!dirHandle) return;
        
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            const currentFiles = filesRef.current;
            const currentHandle = dirHandleRef.current;
            
            if (Object.keys(currentFiles).length > 0 && currentHandle) {
                // Use the fresh ref values
                Utils.saveFiles(currentHandle, currentFiles);
            }
        }, 1000);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [files, dirHandle]);


    useEffect(() => {
        if (!files[activeFile] && Object.keys(files).length) setActiveFile(Object.keys(files)[0]);
    }, [files]);

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

INTERACTIVE PLANNING (CRITICAL):
If the user's request is complex, involves multiple files, or if you are unsure about the best approach:
1. DO NOT generate code immediately.
2. Propose options to the user (e.g., "Option 1: Inline Patch", "Option 2: Refactor").
3. Wait for the user to confirm.
4. Only output code when the path is clear.

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

    const handleSend = async () => {
      if (!input.trim() || appStatus !== 'idle') return;
      
      const userMsg = { role: 'user', content: input };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      setInput('');
      setStreamText('');
      
      setAppStatus('reading');
      setStatusMsg('Reading context...');

      // Context Construction
      const contextFiles = Object.entries(files).map(([n, c]) => `<!-- filename: ${n} -->\n${c}`).join('\n\n');
      
      let contextString = `CURRENT FILES:\n${contextFiles}\n\nUSER REQUEST: ${input}`;
      
      if (runtimeError) {
        contextString += `\n\n!!! DETECTED RUNTIME ERROR IN PREVIEW !!!\nError: ${runtimeError}\nPLEASE FIX THIS ERROR.`;
      }

      const apiMsgs = [
          { role: 'system', content: getSystemPrompt() },
          { role: 'system', content: contextString },
          ...newMsgs.slice(-6) 
      ];

      setRuntimeError(null);

      try {
        setAppStatus('thinking');
        setStatusMsg('Contacting model...');

        const cleanUrl = settings.apiUrl.replace(/\/chat\/completions$/, '').replace(/\/v1$/, '').replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.model, messages: apiMsgs, stream: true, temperature: 0.7, max_tokens: 32000 })
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
        
        let nextFiles = Utils.applyPatchesToFiles(files, parsed.patches);
        nextFiles = { ...nextFiles, ...parsed.files };
        
        // Only update state if we actually have new/changed files
        if (Object.keys(nextFiles).length > 0) {
            setFiles(nextFiles);
            setViewMode('preview');
        }
        
        const finalMsgContent = parsed.thought 
            ? `**Plan:** ${parsed.thought}\n\n${fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()}`
            : fullText;

        setMessages(prev => [...prev, { role: 'assistant', content: finalMsgContent }]);

      } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
      } finally {
        setAppStatus('idle');
        setStatusMsg('');
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
        <div className="w-[400px] flex flex-col border-r border-gray-800 bg-gray-950 z-10 shadow-xl flex-shrink-0">
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

           <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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

           <!-- STATUS BAR AREA -->
           <div className="bg-gray-950 border-t border-gray-800">
              <${StatusBar} status=${appStatus} message=${statusMsg} />
              
              <div className="p-4 relative">
                 ${runtimeError && html`
                    <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300 flex items-center gap-2 cursor-pointer hover:bg-red-900/30 transition" onClick=${() => setInput(`Fix error: ${runtimeError}`)}>
                       <${Icon} name="Alert" size=${14} />
                       <span className="font-bold">Error:</span> ${runtimeError}
                       <span className="ml-auto text-red-400 underline text-[10px]">FIX</span>
                    </div>
                 `}
                 <div className="relative group">
                    <textarea 
                       value=${input} 
                       onInput=${e => setInput(e.target.value)} 
                       onKeyDown=${e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                       className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 pr-12 text-sm outline-none focus:border-purple-500/50 transition resize-none group-hover:border-gray-700 text-gray-200" 
                       rows=${3} 
                       placeholder="Ask to change something..." 
                    />
                    <button onClick=${handleSend} disabled=${appStatus !== 'idle' || !input.trim()} className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed">
                       <${Icon} name="Send" />
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
           />
        </div>

        <${SettingsModal} 
           isOpen=${showSettings} 
           onClose=${() => setShowSettings(false)} 
           settings=${settings} 
           onSave=${s => setSettings(s)} 
           systemPromptPreview=${getSystemPrompt()}
        />
      </div>
    `;
  };

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
})();
