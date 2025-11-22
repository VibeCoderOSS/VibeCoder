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
          input[type=range] {
            -webkit-appearance: none; 
            background: transparent; 
          }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #a855f7;
            cursor: pointer;
            margin-top: -6px; 
          }
          input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 4px;
            cursor: pointer;
            background: #374151;
            border-radius: 2px;
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
      Pause: '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>',
      Stop: '<rect x="6" y="6" width="12" height="12"></rect>',
      Image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
      Close: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
      Trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
      Target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line>',
      Clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
      Package: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
      Undo: '<path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>',
      Smartphone: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
      Tablet: '<rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line>',
      Monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
      Rotate: '<path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>'
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
  const CodePreview = ({ files, activeFile, setActiveFile, viewMode, setViewMode, onFileChange, modifiedFiles = [], onOpenHistory }) => {
    const [iframeUrl, setIframeUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(true);
    
    // Responsive State
    const [deviceMode, setDeviceMode] = useState('full'); // full | mobile | tablet | desktop
    const [orientation, setOrientation] = useState('portrait'); // portrait | landscape
    const [scaleFactor, setScaleFactor] = useState(1);
    
    const [copied, setCopied] = useState(false);
    const [pointMode, setPointMode] = useState(false);
    const cleanupRef = useRef(null);
    const containerRef = useRef(null);
    const iframeRef = useRef(null);
    
    // Dateibaum aufbauen
    const buildFileTree = () => {
      const root = {};
      Object.keys(files || {}).forEach(path => {
        const parts = path.split('/');
        let current = root;
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = { children: {}, isFile: index === parts.length - 1 };
          }
          if (index === parts.length - 1) {
            current[part].isFile = true;
          } else {
            current[part].isFile = false;
          }
          current = current[part].children;
        });
      });
      return root;
    };

    const renderTree = (nodeMap, prefix = '') => {
      const entries = Object.entries(nodeMap).sort(([aName], [bName]) => aName.localeCompare(bName));
      return entries.map(([name, node]) => {
        const fullPath = prefix ? prefix + '/' + name : name;
        if (node.isFile) {
          const isActive = activeFile === fullPath;
          const isModified = modifiedFiles.includes(fullPath);
          return html`
            <button
              key=${fullPath}
              onClick=${() => setActiveFile(fullPath)}
              className=${`w-full text-left px-3 py-1.5 text-[12px] font-mono flex items-center gap-2 ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800/60'
              }`}
            >
              <span className=${`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isModified ? 'bg-yellow-400 animate-pulse' : (isActive ? 'bg-purple-400' : 'bg-gray-600')
              }`}></span>
              <span className=${`truncate ${isModified ? 'text-yellow-100' : ''}`}>${name}</span>
              ${isModified && html`<span className="text-[9px] text-yellow-500 ml-auto font-bold">MOD</span>`}
            </button>
          `;
        } else {
          return html`
            <div key=${fullPath} className="mb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] uppercase tracking-wide text-gray-500">
                 <span className="text-gray-600">▾</span>
                 <span className="truncate">${name}</span>
              </div>
              <div className="ml-3 border-l border-gray-800">
                ${renderTree(node.children, fullPath)}
              </div>
            </div>
          `;
        }
      });
    };

    const fileTree = buildFileTree();
    
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

    // Point & Vibe Modus in das iframe schicken
    useEffect(() => {
      if (viewMode !== 'preview') return;
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          { type: 'toggle-point-vibe', enabled: pointMode },
          '*'
        );
      } catch (e) {
        console.error('Point & Vibe toggle failed', e);
      }
    }, [pointMode, iframeUrl, viewMode]);

    // --- INTELLIGENT RESPONSIVE SCALING ---
    // Berechnet den Scale-Faktor, damit das simulierte Gerät (z.B. 1280px Desktop)
    // in den kleinen Vorschau-Container passt.
    useLayoutEffect(() => {
      if (viewMode !== 'preview' || !containerRef.current) return;

      const calculateScale = () => {
         const wrapper = containerRef.current;
         const availWidth = wrapper.offsetWidth - 40; // 20px padding each side
         const availHeight = wrapper.offsetHeight - 40; 
         
         let targetWidth, targetHeight;

         if (deviceMode === 'full') {
            // Im Full mode nutzen wir einfach 100%, kein scaling nötig.
            setScaleFactor(1);
            return;
         }

         // Device definitions
         if (deviceMode === 'mobile') {
            targetWidth = orientation === 'portrait' ? 375 : 667;
            targetHeight = orientation === 'portrait' ? 667 : 375;
         } else if (deviceMode === 'tablet') {
            targetWidth = orientation === 'portrait' ? 768 : 1024;
            targetHeight = orientation === 'portrait' ? 1024 : 768;
         } else if (deviceMode === 'desktop') {
            targetWidth = 1280;
            targetHeight = 800;
         }

         // Scale calculation: Fit target into available space
         const scaleX = availWidth / targetWidth;
         const scaleY = availHeight / targetHeight;
         
         // Wir skalieren nur runter, nie hoch (pixelig)
         const scale = Math.min(1, scaleX, scaleY);
         setScaleFactor(scale);
      };

      const observer = new ResizeObserver(calculateScale);
      observer.observe(containerRef.current);
      calculateScale(); 

      return () => observer.disconnect();
    }, [deviceMode, orientation, viewMode]);

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

    // Helper: Get dimensions for the iframe container
    const getContainerStyle = () => {
        if (deviceMode === 'full') return { width: '100%', height: '100%', border: 'none' };

        let width, height;
        if (deviceMode === 'mobile') { width = orientation === 'portrait' ? 375 : 667; height = orientation === 'portrait' ? 667 : 375; }
        else if (deviceMode === 'tablet') { width = orientation === 'portrait' ? 768 : 1024; height = orientation === 'portrait' ? 1024 : 768; }
        else if (deviceMode === 'desktop') { width = 1280; height = 800; }

        return {
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'center center',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            borderRadius: deviceMode === 'mobile' ? '24px' : (deviceMode === 'tablet' ? '16px' : '8px'),
            overflow: 'hidden' // clip iframe corners
        };
    };

    return html`
      <div className="flex flex-col h-full bg-gray-900">
        <!-- Toolbar -->
        <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0 shadow-sm z-20">
           
           <!-- View Toggle -->
           <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 mr-4 flex-shrink-0">
             <button onClick=${() => setViewMode('preview')} className=${`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'preview' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}><${Icon} name="Eye" size=${14} /> Preview</button>
             <button onClick=${() => setViewMode('code')} className=${`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'code' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}><${Icon} name="Code" size=${14} /> Code</button>
           </div>

           <!-- Preview Controls -->
           ${viewMode === 'preview' && html`
              <div className="flex items-center gap-2 px-3 border-l border-r border-gray-800 mx-2 overflow-x-auto no-scrollbar">
                 
                 <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800 mr-2 flex-shrink-0">
                    <button onClick=${() => setDeviceMode('mobile')} className=${`p-1.5 rounded transition ${deviceMode === 'mobile' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`} title="Mobile (375px)">
                        <${Icon} name="Smartphone" size=${16} />
                    </button>
                    <button onClick=${() => setDeviceMode('tablet')} className=${`p-1.5 rounded transition ${deviceMode === 'tablet' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`} title="Tablet (768px)">
                        <${Icon} name="Tablet" size=${16} />
                    </button>
                    <button onClick=${() => setDeviceMode('desktop')} className=${`p-1.5 rounded transition ${deviceMode === 'desktop' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`} title="Desktop (1280px)">
                        <${Icon} name="Monitor" size=${16} />
                    </button>
                     <button onClick=${() => setDeviceMode('full')} className=${`p-1.5 rounded transition ${deviceMode === 'full' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`} title="Full Width">
                        <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
                    </button>
                 </div>

                 ${deviceMode !== 'full' && deviceMode !== 'desktop' && html`
                    <button onClick=${() => setOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')} className="p-2 text-gray-500 hover:text-white bg-gray-950 hover:bg-gray-800 border border-gray-800 rounded transition mr-2" title="Rotate">
                        <${Icon} name="Rotate" size=${16} />
                    </button>
                 `}

                 <div className="w-[1px] h-6 bg-gray-800 mx-2"></div>

                 <button onClick=${() => setIsPlaying(!isPlaying)} className=${`p-2 rounded transition ${isPlaying ? 'text-blue-400 hover:bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`} title=${isPlaying ? "Pause" : "Play"}>
                    <${Icon} name=${isPlaying ? "Pause" : "Play"} size=${18} />
                 </button>
                 <button onClick=${handleReload} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition" title="Reload">
                    <${Icon} name="Refresh" size=${18} />
                 </button>
                 
                 <button 
                    onClick=${() => setPointMode(v => !v)} 
                    className=${`flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wide font-semibold transition flex-shrink-0 border ${
                      pointMode ? 'bg-purple-600/20 text-purple-200 border-purple-500/60' : 'text-gray-500 hover:text-gray-200 border-transparent hover:border-gray-700'
                    }`}
                    title="Point & Vibe"
                 >
                    <${Icon} name="Target" size=${14} />
                 </button>
              </div>
           `}

            <div className="flex-1"></div>

           <!-- Actions -->
           <div className="flex items-center gap-2 pl-2 flex-shrink-0">
             <button onClick=${onOpenHistory} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition" title="History">
                <${Icon} name="Clock" size=${14} /> <span className="hidden lg:inline">History</span>
             </button>
             <div className="w-[1px] h-6 bg-gray-800 mx-1"></div>
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
              <div className="relative w-full h-full flex items-center justify-center bg-gray-800/50 overflow-hidden">
                  ${pointMode && html`
                    <div className="pointer-events-none absolute top-4 right-4 z-30 bg-purple-950/90 text-[11px] text-purple-50 px-3 py-1.5 rounded-full border border-purple-500/70 shadow-lg flex items-center gap-2">
                       <${Icon} name="Target" size=${14} />
                       <span>Point & Vibe aktiv</span>
                    </div>
                  `}
                  
                  <!-- Device Wrapper -->
                  <div style=${getContainerStyle()}>
                    ${isPlaying && iframeUrl ? html`
                        <iframe key=${iframeUrl} ref=${iframeRef} src=${iframeUrl} className="w-full h-full border-none bg-white" sandbox="allow-scripts allow-modals allow-forms allow-same-origin allow-popups"></iframe>
                    ` : html`
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 flex-col border border-gray-700">
                             <div className="p-6 rounded-full bg-gray-800 mb-4"><${Icon} name="Pause" size=${48} /></div>
                             <p className="text-lg font-medium">Preview Paused</p>
                        </div>
                    `}
                  </div>
                  
                  ${deviceMode !== 'full' && html`
                      <div className="absolute bottom-4 px-3 py-1 bg-gray-900/80 text-[10px] text-gray-400 rounded-full backdrop-blur border border-gray-800">
                         ${Math.round(scaleFactor * 100)}% Scale
                      </div>
                  `}
              </div>
           ` : html`
              <div className="flex w-full h-full">
                 <div className="flex-1">
                    <textarea 
                       value=${files[activeFile] || ''} 
                       onInput=${e => onFileChange(activeFile, e.target.value)} 
                       className="w-full h-full bg-[#0f0f12] text-gray-300 p-6 font-mono text-sm outline-none resize-none custom-scrollbar leading-relaxed" 
                       spellCheck="false" 
                    />
                 </div>
                 <div className="w-64 border-l border-gray-800 bg-gray-950 flex-shrink-0 flex flex-col">
                    <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800 flex items-center justify-between">
                       <span>Dateien</span>
                       <span className="text-gray-600 text-[10px]">Projekt</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
                       ${renderTree(fileTree)}
                    </div>
                 </div>
              </div>
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl w-[600px] max-w-[95%] h-[90vh] shadow-2xl overflow-hidden flex flex-col">
          <div className="h-1 bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0"></div>
          
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><${Icon} name="Settings" /> Settings</h2>
              <button onClick=${onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-8">
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

               <!-- Generation Parameters -->
               <div className="space-y-4">
                 <h3 className="text-sm font-bold text-gray-400 uppercase border-b border-gray-800 pb-2">Generation Parameters</h3>
                 
                 <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-500 uppercase">Temperature</label>
                        <span className="text-xs text-gray-300 font-mono">${local.temperature}</span>
                    </div>
                    <input 
                        type="range" min="0" max="2" step="0.1" 
                        value=${local.temperature} 
                        onChange=${e => setLocal({...local, temperature: parseFloat(e.target.value)})} 
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-500 uppercase">Context Window (Max Tokens)</label>
                        <span className="text-xs text-gray-300 font-mono">${local.maxTokens}</span>
                    </div>
                    <input 
                        type="number" step="1024"
                        value=${local.maxTokens} 
                        onChange=${e => setLocal({...local, maxTokens: parseInt(e.target.value)})} 
                        className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-gray-300 outline-none focus:border-purple-500"
                    />
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

  // --- HISTORY MODAL ---
  const HistoryModal = ({ isOpen, onClose, history, currentVersionIndex, onRestore }) => {
    if (!isOpen) return null;

    return html`
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
         <div className="bg-gray-900 border border-gray-800 rounded-xl w-[600px] max-w-[95%] h-[80vh] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
               <h3 className="font-bold text-white flex items-center gap-2"><${Icon} name="Clock" /> Version History</h3>
               <button onClick=${onClose}><${Icon} name="Close" /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
               ${history.length === 0 && html`<div className="text-center text-gray-500 py-10">No history yet. Make some changes!</div>`}
               ${history.slice().reverse().map((entry, revIndex) => {
                   const realIndex = history.length - 1 - revIndex;
                   const isCurrent = realIndex === currentVersionIndex;
                   return html`
                      <div key=${realIndex} className=${`p-4 rounded-lg border transition relative ${isCurrent ? 'bg-purple-900/20 border-purple-500/50' : 'bg-gray-950 border-gray-800 hover:border-gray-600'}`}>
                         <div className="flex justify-between items-start mb-2">
                            <div>
                               <span className="text-xs font-mono text-gray-500">#${realIndex + 1}</span>
                               <span className="text-xs text-gray-400 ml-2">${new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>
                            ${!isCurrent && html`
                                <button onClick=${() => { onRestore(realIndex); onClose(); }} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-2 py-1 rounded border border-gray-700 flex items-center gap-1">
                                   <${Icon} name="Undo" size=${12} /> Restore
                                </button>
                            `}
                            ${isCurrent && html`<span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">CURRENT</span>`}
                         </div>
                         <div className="text-sm text-gray-300 font-medium line-clamp-2">"${entry.prompt || 'Initial State'}"</div>
                         <div className="text-xs text-gray-500 mt-1">${Object.keys(entry.files).length} files</div>
                      </div>
                   `;
               })}
            </div>
         </div>
      </div>
    `;
  };

  window.VC = window.VC || {};
  window.VC.Components = { Styles, Icon, SettingsModal, StatusBar, CodePreview, HistoryModal };
})();