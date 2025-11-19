
// js/components.js
(function() {
  const html = htm.bind(React.createElement);
  const { useState, useEffect, useRef, useLayoutEffect } = React;
  const { Icons } = window.VC.Components || { Icons: {} };

  // --- GLOBAL STYLES ---
  const Styles = () => {
    useEffect(() => {
      if (!document.getElementById('vc-styles')) {
        const s = document.createElement('style');
        s.id = 'vc-styles';
        s.innerHTML = `
          @keyframes orb-spin { 
            0% { background-position: 0% 50%; transform: rotate(0deg); } 
            50% { background-position: 100% 50%; transform: rotate(180deg); } 
            100% { background-position: 0% 50%; transform: rotate(360deg); } 
          }
          .liquid-orb {
            background: linear-gradient(135deg, #a855f7, #3b82f6, #ec4899);
            background-size: 200% 200%;
            animation: orb-spin 6s linear infinite;
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);
          }
          .status-bar-gradient {
            background: linear-gradient(90deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
            border-top: 1px solid rgba(255,255,255,0.05);
          }
          .tab-active {
            border-bottom: 2px solid #a855f7;
            color: white;
            background: rgba(168, 85, 247, 0.05);
          }
        `;
        document.head.appendChild(s);
      }
    }, []);
    return null;
  };

  // --- SVG ICONS ---
  const Icon = ({ name, size = 18, className = "" }) => {
    const paths = {
      Settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
      Send: '<line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>',
      Code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
      Eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
      Refresh: '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>',
      Folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
      Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
      Copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
      Sparkles: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>',
      Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
      Alert: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
      Play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
      Pause: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>'
    };
    return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=${className} dangerouslySetInnerHTML=${{__html: paths[name] || ''}}></svg>`;
  };

  // --- STATUS BAR ---
  const StatusBar = ({ status, message }) => {
    if (status === 'idle' && !message) return null;

    let iconName = 'Sparkles';
    let colorClass = 'text-purple-400';
    let animateClass = '';

    if (status === 'reading') { iconName = 'Folder'; colorClass = 'text-blue-400'; animateClass = 'animate-pulse'; }
    else if (status === 'thinking') { iconName = 'Zap'; colorClass = 'text-yellow-400'; animateClass = 'animate-pulse'; }
    else if (status === 'generating') { iconName = 'Code'; colorClass = 'text-green-400'; animateClass = 'animate-bounce'; }
    else if (status === 'patching') { iconName = 'Refresh'; colorClass = 'text-orange-400'; animateClass = 'animate-spin'; }

    return html`
      <div className="status-bar-gradient px-4 py-2 flex items-center gap-3 text-xs font-mono text-gray-300 border-b border-gray-800">
         <div className=${`${colorClass} ${animateClass}`}><${Icon} name=${iconName} size=${14} /></div>
         <span className="uppercase tracking-wide font-bold opacity-70">${status === 'idle' ? 'Done' : status}</span>
         <span className="w-[1px] h-3 bg-gray-700 mx-1"></span>
         <span className="truncate opacity-90">${message}</span>
      </div>
    `;
  };

  // --- CODE PREVIEW ---
  const CodePreview = ({ files, activeFile, setActiveFile, viewMode, setViewMode, onFileChange }) => {
    const [iframeUrl, setIframeUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [scale, setScale] = useState('fit'); 
    const [scaleFactor, setScaleFactor] = useState(1);
    const [copied, setCopied] = useState(false);
    const cleanupRef = useRef(null);
    const containerRef = useRef(null);
    
    // Handle Preview Generation
    useEffect(() => {
      if (viewMode === 'preview' && files['index.html']) {
        if (cleanupRef.current) cleanupRef.current();

        if (isPlaying) {
          try {
              const { url, cleanup } = window.VC.Utils.createPreviewSession(files);
              setIframeUrl(url);
              cleanupRef.current = cleanup;
          } catch(e) {
              console.error("Preview Gen Failed", e);
              setIframeUrl(null);
          }
        } else {
            setIframeUrl(null);
        }
      }

      return () => {
        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
      };
    }, [files, viewMode, isPlaying]);

    // Handle Intelligent Scaling
    useLayoutEffect(() => {
      if (viewMode !== 'preview' || !containerRef.current) return;

      const updateScale = () => {
        if (scale === 'fit') {
           const containerWidth = containerRef.current.offsetWidth;
           const baseWidth = 1280; 
           // Calculate ratio to fit, accounting for padding
           let ratio = (containerWidth - 64) / baseWidth; 
           if (ratio > 1) ratio = 1;
           setScaleFactor(ratio);
        } else {
           setScaleFactor(parseFloat(scale));
        }
      };

      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      updateScale(); 

      return () => observer.disconnect();
    }, [scale, viewMode]);

    const handleReload = () => {
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 50);
    };

    const handleCopy = () => {
      if (files[activeFile]) {
        navigator.clipboard.writeText(files[activeFile]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };

    const handleDownload = async () => {
      const zip = new JSZip();
      Object.entries(files).forEach(([name, content]) => zip.file(name, content));
      const blob = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vibecode_project.zip";
      a.click();
    };

    const scaledWidth = scale === 'fit' ? '1280px' : (scale === '1' ? '100%' : `${100/scaleFactor}%`);
    const scaledHeight = scale === '1' ? '100%' : `${100/scaleFactor}%`;

    return html`
      <div className="flex flex-col h-full bg-gray-900">
        <!-- Toolbar -->
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0 shadow-sm z-20">
           
           <!-- View Toggle -->
           <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 mr-4">
             <button onClick=${() => setViewMode('preview')} className=${`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'preview' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}><${Icon} name="Eye" size=${14} /> Preview</button>
             <button onClick=${() => setViewMode('code')} className=${`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'code' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}><${Icon} name="Code" size=${14} /> Code</button>
           </div>

           <!-- Preview Controls -->
           ${viewMode === 'preview' && html`
              <div className="flex items-center gap-3 px-3 border-l border-r border-gray-800 mx-2">
                 <button onClick=${() => setIsPlaying(!isPlaying)} className=${`p-2 rounded transition ${isPlaying ? 'text-blue-400 hover:bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`} title=${isPlaying ? "Pause" : "Play"}>
                    <${Icon} name=${isPlaying ? "Pause" : "Play"} size=${18} />
                 </button>
                 <button onClick=${handleReload} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition" title="Reload">
                    <${Icon} name="Refresh" size=${18} />
                 </button>
                 <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] uppercase text-gray-600 font-bold">Zoom</span>
                    <select 
                       value=${scale} 
                       onChange=${e => setScale(e.target.value)} 
                       className="bg-gray-950 border border-gray-800 text-xs text-gray-300 rounded px-2 py-1 outline-none hover:border-gray-600 focus:border-purple-500 transition"
                    >
                       <option value="fit">Fit Window</option>
                       <option value="1">100%</option>
                       <option value="0.75">75%</option>
                       <option value="0.5">50%</option>
                    </select>
                 </div>
              </div>
           `}

           <!-- File Tabs (Code View) -->
           ${viewMode === 'code' && html`
             <div className="flex-1 flex gap-1 overflow-x-auto custom-scrollbar mx-2">
               ${Object.keys(files).map(f => html`
                  <button onClick=${() => setActiveFile(f)} className=${`px-3 py-1.5 text-xs font-mono transition border-b-2 whitespace-nowrap ${activeFile === f ? 'border-purple-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                   ${f}
                </button>
               `)}
             </div>
           `}

           <!-- Actions -->
           <div className="flex items-center gap-1 pl-4 ml-auto">
             <button onClick=${handleCopy} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition" title="Copy Code">
                <${Icon} name="Copy" size=${16} className=${copied ? "text-green-500" : ""} />
             </button>
             <button onClick=${handleDownload} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition" title="Download Zip">
                <${Icon} name="Download" size=${16} />
             </button>
           </div>
        </div>

        <!-- Content Area -->
        <div className="flex-1 relative bg-[#0f0f12] overflow-hidden flex items-center justify-center" ref=${containerRef}>
           ${Object.keys(files).length === 0 ? html`
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                 <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4"><${Icon} name="Code" size=${32} /></div>
                 <p>Ready to build.</p>
              </div>
           ` : viewMode === 'preview' ? html`
              <div className=${`relative w-full h-full flex flex-col items-center bg-gray-800/50 overflow-hidden ${scale !== '1' ? 'py-8' : ''}`}>
                  <!-- Scaled Container -->
                  <div style=${{
                      width: scaledWidth,
                      height: scaledHeight, 
                      transform: `scale(${scaleFactor})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.2s ease-out, width 0.2s ease-out',
                      boxShadow: scale === '1' ? 'none' : '0 20px 50px rgba(0,0,0,0.5)',
                      overflow: 'hidden',
                      borderRadius: scale === '1' ? '0' : '8px',
                      backgroundColor: 'white'
                  }}>
                    ${isPlaying && iframeUrl ? html`
                        <iframe src=${iframeUrl} className="w-full h-full border-none bg-white rounded-md" sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"></iframe>
                    ` : html`
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 flex-col border border-gray-700 rounded-md">
                             <div className="p-6 rounded-full bg-gray-800 mb-4"><${Icon} name="Pause" size=${48} /></div>
                             <p className="text-lg font-medium">Preview Paused</p>
                        </div>
                    `}
                  </div>
              </div>
           ` : html`
              <textarea 
                 value=${files[activeFile] || ''} 
                 onInput=${e => onFileChange(activeFile, e.target.value)} 
                 className="w-full h-full bg-[#0f0f12] text-gray-300 p-6 font-mono text-sm outline-none resize-none custom-scrollbar leading-relaxed" 
                 spellCheck="false" 
              />
           `}
        </div>
      </div>
    `;
  };

  // --- SETTINGS MODAL ---
  const SettingsModal = ({ isOpen, onClose, settings, onSave, systemPromptPreview }) => {
    const [local, setLocal] = useState(settings);
    const [models, setModels] = useState([]);
    
    const fetchModels = async () => {
      const m = await window.VC.Utils.fetchModels(local.apiUrl);
      setModels(m);
      if(m.length && !local.model) setLocal({...local, model: m[0].id});
    };

    if (!isOpen) return null;

    return html`
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-800 rounded-xl w-[600px] max-w-[95%] h-[85vh] shadow-2xl overflow-hidden flex flex-col">
          <div className="h-1 bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0"></div>
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><${Icon} name="Settings" /> Settings</h2>
              <button onClick=${onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-6">
               <!-- Connection Settings -->
               <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-400 uppercase border-b border-gray-800 pb-2">Connection</h3>
                 <div>
                   <label className="text-xs text-gray-500 uppercase block mb-1">API URL</label>
                   <input value=${local.apiUrl} onInput=${e => setLocal({...local, apiUrl: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-300 outline-none focus:border-purple-500" />
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 uppercase block mb-1 flex justify-between"><span>Model</span> <button onClick=${fetchModels} className="text-blue-500 hover:underline">Refresh</button></label>
                   ${models.length ? 
                     html`<select value=${local.model} onChange=${e => setLocal({...local, model: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-300 outline-none">
                       ${models.map(m => html`<option value=${m.id}>${m.id}</option>`)}
                     </select>` :
                     html`<input value=${local.model} onInput=${e => setLocal({...local, model: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-300" />`
                   }
                 </div>
               </div>

               <!-- Logic Settings -->
               <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-400 uppercase border-b border-gray-800 pb-2">Logic & Output</h3>
                 
                 <div className="p-3 bg-gray-950 rounded border border-gray-800">
                   <label className="text-xs text-gray-500 uppercase block mb-2">Edit Strategy</label>
                   <div className="flex flex-col gap-2">
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input type="radio" name="mode" checked=${local.mode === 'auto'} onChange=${() => setLocal({...local, mode: 'auto'})} />
                       Auto (Recommended)
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input type="radio" name="mode" checked=${local.mode === 'rewrite'} onChange=${() => setLocal({...local, mode: 'rewrite'})} />
                       Force Full Rewrites
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                       <input type="radio" name="mode" checked=${local.mode === 'patch'} onChange=${() => setLocal({...local, mode: 'patch'})} />
                       Force Patching
                     </label>
                   </div>
                 </div>

                 <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">System Prompt (Read-Only)</label>
                    <textarea 
                      readOnly 
                      value=${systemPromptPreview || ''} 
                      className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs font-mono text-gray-500 outline-none resize-y h-32"
                    />
                 </div>
               </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-800 bg-gray-900 flex-shrink-0">
             <button onClick=${() => { onSave(local); onClose(); }} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded font-medium shadow-lg shadow-purple-900/20">Save Configuration</button>
          </div>
        </div>
      </div>
    `;
  };

  window.VC = window.VC || {};
  window.VC.Components = { Styles, Icon, SettingsModal, StatusBar, CodePreview };
})();
