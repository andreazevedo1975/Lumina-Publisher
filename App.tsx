import React, { useState, useReducer, useEffect, useRef } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import EditorCanvas from './components/EditorCanvas';
import { Project, PageElement, ViewMode, Unit, ElementType, ColorSwatch, Page, MasterPage } from './types';
import { INITIAL_PROJECT, DEFAULT_TYPOGRAPHY, DEFAULT_BOX, INITIAL_SWATCHES } from './constants';
import { Icons } from './components/Icon';
import * as GeminiService from './services/geminiService';

// Simple Reducer for complex state
type Action = 
  | { type: 'SELECT_PAGE'; payload: string }
  | { type: 'ADD_PAGE' }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string, updates: Partial<PageElement> } }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'UPDATE_STYLE'; payload: { id: string, styleUpdates: any } }
  | { type: 'ADD_ASSET_ELEMENT'; payload: { url: string, x: number, y: number, style?: any } }
  | { type: 'ADD_ASSET_TO_LIBRARY'; payload: string }
  | { type: 'REMOVE_ASSET_FROM_LIBRARY'; payload: string }
  | { type: 'ADD_SWATCH'; payload: ColorSwatch }
  | { type: 'REMOVE_SWATCH'; payload: string }
  | { type: 'UPDATE_SWATCH'; payload: ColorSwatch }
  | { type: 'IMPORT_BOOK'; payload: Project }
  | { type: 'RENAME_PROJECT'; payload: string }
  | { type: 'UPDATE_MASTER_PAGE'; payload: { id: string, updates: Partial<MasterPage> } };

function projectReducer(state: Project, action: Action): Project {
  switch (action.type) {
    case 'SELECT_PAGE':
      return { ...state, activePageId: action.payload, activeElementId: null };
    case 'ADD_PAGE':
      const newPageId = `page-${state.pages.length + 1}`;
      const newPage = {
        id: newPageId,
        masterPageId: state.masterPages[0].id,
        elements: []
      };
      return { ...state, pages: [...state.pages, newPage], activePageId: newPageId };
    case 'SELECT_ELEMENT':
      return { ...state, activeElementId: action.payload };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        pages: state.pages.map(p => 
          p.id === state.activePageId 
            ? { ...p, elements: p.elements.map(el => el.id === action.payload.id ? { ...el, ...action.payload.updates } : el) }
            : p
        )
      };
    case 'REMOVE_ELEMENT':
      return {
          ...state,
          activeElementId: null,
          pages: state.pages.map(p => 
              p.id === state.activePageId 
              ? { ...p, elements: p.elements.filter(el => el.id !== action.payload) }
              : p
          )
      };
    case 'UPDATE_STYLE':
      return {
        ...state,
        pages: state.pages.map(p => 
          p.id === state.activePageId 
            ? { ...p, elements: p.elements.map(el => el.id === action.payload.id ? { ...el, style: { ...el.style, ...action.payload.styleUpdates } } : el) }
            : p
        )
      };
    case 'ADD_ASSET_ELEMENT':
       const newElement: PageElement = {
           id: `el-${Date.now()}`,
           type: ElementType.IMAGE,
           content: action.payload.url,
           style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, ...(action.payload.style || {}) },
           x: action.payload.x,
           y: action.payload.y,
           width: 200,
           height: 200,
           rotation: 0,
           locked: false,
           altText: ''
       };
       return {
           ...state,
           pages: state.pages.map(p => p.id === state.activePageId ? { ...p, elements: [...p.elements, newElement]} : p)
       };
    case 'ADD_ASSET_TO_LIBRARY':
        return {
            ...state,
            assets: [action.payload, ...state.assets]
        };
    case 'REMOVE_ASSET_FROM_LIBRARY':
        return {
            ...state,
            assets: state.assets.filter(a => a !== action.payload)
        };
    case 'ADD_SWATCH':
        return {
            ...state,
            swatches: [...state.swatches, action.payload]
        };
    case 'REMOVE_SWATCH':
        return {
            ...state,
            swatches: state.swatches.filter(s => s.id !== action.payload)
        };
    case 'UPDATE_SWATCH':
        return {
            ...state,
            swatches: state.swatches.map(s => s.id === action.payload.id ? action.payload : s)
        };
    case 'IMPORT_BOOK':
        return action.payload;
    case 'RENAME_PROJECT':
        return { ...state, name: action.payload };
    case 'UPDATE_MASTER_PAGE':
        return {
            ...state,
            masterPages: state.masterPages.map(mp => mp.id === action.payload.id ? { ...mp, ...action.payload.updates } : mp)
        };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [project, dispatch] = useReducer(projectReducer, INITIAL_PROJECT);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);
  const [preflightStatus, setPreflightStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processando...");
  const [autoLayoutRunning, setAutoLayoutRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePage = project.pages.find(p => p.id === project.activePageId) || project.pages[0];
  const masterPage = project.masterPages.find(mp => mp.id === activePage.masterPageId) || project.masterPages[0];
  const activeElement = activePage.elements.find(el => el.id === project.activeElementId);

  // Drop handler for canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData('text/plain');
    if (dataString) {
        // Parse metadata (format: "url|flag1|flag2")
        const parts = dataString.split('|');
        const url = parts[0];
        const isGrayscale = parts.includes('grayscale');
        
        const styleOverrides: any = {};
        if (isGrayscale) {
            styleOverrides.filter = 'grayscale(100%)';
        }

        dispatch({ 
            type: 'ADD_ASSET_ELEMENT', 
            payload: { 
                url, 
                x: e.nativeEvent.offsetX, 
                y: e.nativeEvent.offsetY,
                style: styleOverrides
            } 
        });
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handlePreflight = async () => {
      setPreflightStatus("Executando verificação com Gemini...");
      const summary = `Project has ${project.pages.length} pages. Active page has ${activePage.elements.length} elements.`;
      const result = await GeminiService.runPreflightCheck(summary);
      setPreflightStatus(result);
      setTimeout(() => setPreflightStatus(null), 5000);
  };

  // --- SMART IMPORT LOGIC ---
  const triggerSmartImport = () => {
      fileInputRef.current?.click();
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setLoadingMessage("Iniciando leitura do arquivo...");

      try {
          let textContent = '';

          // Handle Text/Markdown locally
          if (file.type === 'text/plain' || file.name.endsWith('.md')) {
               setLoadingMessage("Lendo arquivo de texto...");
               textContent = await new Promise((resolve) => {
                   const reader = new FileReader();
                   reader.onload = (evt) => resolve(evt.target?.result as string);
                   reader.readAsText(file);
               });
          } 
          // Handle PDF/DOCX via Gemini AI
          else if (file.type === 'application/pdf' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.name.endsWith('.docx')) {
               setLoadingMessage("Lumina AI: Extraindo estrutura e texto do documento...");
               textContent = await GeminiService.parseDocumentToMarkdown(file);
          } else {
               alert("Formato de arquivo não suportado. Use .txt, .md, .pdf ou .docx");
               setIsProcessing(false);
               return;
          }

          if (textContent) {
              setLoadingMessage("Gerando layout, tipografia e páginas...");
              await new Promise(r => setTimeout(r, 500)); 
              
              const newProject = generateProjectFromText(textContent, file.name);
              dispatch({ type: 'IMPORT_BOOK', payload: newProject });
          }

      } catch (error: any) {
          console.error("Import Error:", error);
          const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
          alert(`Erro ao processar arquivo: ${errorMsg}\n\nVerifique se a chave de API está configurada corretamente.`);
      } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      }
  };

  // --- AUTO LAYOUT LOGIC ---
  const runAutoLayout = async () => {
      if (autoLayoutRunning) return;
      
      const confirmRun = window.confirm("Atenção: A auto-diagramação irá reorganizar TODO o projeto, recriando páginas e posicionando elementos automaticamente. Deseja continuar?");
      if (!confirmRun) return;

      setAutoLayoutRunning(true);
      setLoadingMessage("Analisando conteúdo e re-paginando...");
      setIsProcessing(true);

      await new Promise(r => setTimeout(r, 1000));

      try {
          // 1. Extract all content linearly
          let allContent: {type: ElementType, content: string, style?: any}[] = [];
          
          project.pages.forEach(p => {
              const sortedEls = [...p.elements].sort((a,b) => (a.y - b.y) || (a.x - b.x));
              sortedEls.forEach(el => {
                  if (el.type === ElementType.TEXT || el.type === ElementType.IMAGE) {
                       allContent.push({
                           type: el.type,
                           content: el.content,
                           style: el.style
                       });
                  }
              });
          });

          // 2. Rebuild pages
          const newPages: Page[] = [];
          const CHARS_PER_PAGE = 1400; 
          let currentTextBuffer = '';
          let pageCounter = 1;

          const createPage = (elements: PageElement[]) => {
               const pageId = `page-${pageCounter++}`;
               newPages.push({
                   id: pageId,
                   masterPageId: 'master-a',
                   elements: elements
               });
          };

          let currentElements: PageElement[] = [];
          let currentY = 50;

          const flushTextBuffer = () => {
              if (currentTextBuffer) {
                  currentElements.push({
                      id: `el-text-${Date.now()}-${Math.random()}`,
                      type: ElementType.TEXT,
                      content: currentTextBuffer,
                      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, textAlign: 'justify' },
                      x: 50, y: currentY, width: 495, height: Math.max(100, 750 - currentY),
                      rotation: 0, locked: false
                  });
                  currentTextBuffer = '';
              }
          };

          const pushNewPage = () => {
              flushTextBuffer();
              createPage(currentElements);
              currentElements = [];
              currentY = 50;
          };

          for (const item of allContent) {
              if (item.type === ElementType.IMAGE) {
                  if (currentY + 300 > 750) {
                      pushNewPage();
                  }
                  
                  flushTextBuffer();
                  
                  currentElements.push({
                      id: `el-img-${Date.now()}-${Math.random()}`,
                      type: ElementType.IMAGE,
                      content: item.content,
                      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
                      x: 50, y: currentY, width: 495, height: 280, 
                      rotation: 0, locked: false
                  });
                  currentY += 300;
              } 
              else if (item.type === ElementType.TEXT) {
                   const text = item.content.replace(/<[^>]*>/g, ' ').trim();
                   if (!text) continue;

                   const isHeader = item.content.includes('<h1') || item.content.includes('<h2');
                   
                   if (isHeader) {
                       if (currentY > 200) pushNewPage();
                       
                       currentElements.push({
                          id: `el-head-${Date.now()}-${Math.random()}`,
                          type: ElementType.TEXT,
                          content: item.content,
                          style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
                          x: 50, y: currentY, width: 495, height: 60,
                          rotation: 0, locked: false
                       });
                       currentY += 80;
                   } else {
                       const pTag = `<p style="margin-bottom: 1em;">${text}</p>`;
                       if (currentTextBuffer.length + pTag.length > CHARS_PER_PAGE) {
                           pushNewPage();
                           currentTextBuffer = pTag;
                       } else {
                           currentTextBuffer += pTag;
                       }
                   }
              }
          }

          if (currentTextBuffer || currentElements.length > 0) {
              pushNewPage();
          }
          
          dispatch({ 
              type: 'IMPORT_BOOK', 
              payload: { 
                  ...project, 
                  pages: newPages, 
                  activePageId: newPages[0]?.id || 'page-1' 
              } 
          });

      } catch (e) {
          console.error("Auto Layout Error", e);
          alert("Erro na auto-diagramação.");
      } finally {
          setIsProcessing(false);
          setAutoLayoutRunning(false);
      }
  };

  const generateProjectFromText = (text: string, filename: string): Project => {
      const lines = text.split('\n');
      const title = lines[0].length < 100 ? lines[0].trim() : filename.replace(/\.(txt|md|pdf|docx)$/i, '');
      const newPages: Page[] = [];
      const contentLines = lines.length > 0 && lines[0].length < 100 ? lines.slice(1) : lines;
      const CHARS_PER_PAGE = 1200;
      let currentContent = '';
      let pageCounter = 1;

      const createPage = (contentHtml: string, isCover: boolean = false) => {
          const pageId = `page-${pageCounter++}`;
          let elements: PageElement[] = [];

          if (isCover) {
              elements.push({
                  id: `el-${Date.now()}-${Math.random()}`,
                  type: ElementType.TEXT,
                  content: `<h1 style="font-size: 3em; color: #1e293b; text-align: center; margin-top: 200px;">${contentHtml}</h1><p style="text-align: center; color: #64748b; margin-top: 20px;">Um Auto-Layout Lumina</p>`,
                  style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize: 16 },
                  x: 50, y: 0, width: 500, height: 842, rotation: 0, locked: true
              });
          } else {
              elements.push({
                  id: `el-${Date.now()}-${Math.random()}`,
                  type: ElementType.TEXT,
                  content: contentHtml,
                  style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize: 12, lineHeight: 1.6, textAlign: 'justify' },
                  x: 50, y: 50, width: 495, height: 742, rotation: 0, locked: false
              });
          }

          newPages.push({
              id: pageId,
              masterPageId: 'master-a',
              elements: elements
          });
      };

      createPage(title, true);

      const paragraphs = contentLines.join('\n').split(/\n\s*\n/);
      
      for (let i = 0; i < paragraphs.length; i++) {
          let para = paragraphs[i].trim();
          if (!para) continue;

          if (para.startsWith('#')) {
             if (currentContent.length > 0) {
                 createPage(currentContent);
                 currentContent = '';
             }
             const level = para.match(/^#+/)?.[0].length || 1;
             const text = para.replace(/^#+\s*/, '');
             const fontSize = level === 1 ? '2em' : '1.5em';
             currentContent += `<h${level} style="font-size: ${fontSize}; margin-bottom: 0.5em; font-weight: bold; color: #334155;">${text}</h${level}>`;
          } else {
              const pTag = `<p style="margin-bottom: 1em;">${para}</p>`;
              if ((currentContent.length + pTag.length) > CHARS_PER_PAGE) {
                  createPage(currentContent);
                  currentContent = pTag;
              } else {
                  currentContent += pTag;
              }
          }
      }

      if (currentContent.length > 0) {
          createPage(currentContent);
      }

      return {
          ...INITIAL_PROJECT,
          id: `proj-${Date.now()}`,
          name: title,
          pages: newPages,
          activePageId: newPages[0].id,
          activeElementId: null
      };
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden font-sans">
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={processImportFile} 
        className="hidden" 
        accept=".txt,.md,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />

      {isProcessing && (
          <div className="absolute inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white">
              <Icons.Wand2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <h2 className="text-xl font-bold">Auto-Layout Lumina</h2>
              <p className="text-slate-400 mt-2 text-sm max-w-md text-center animate-pulse">{loadingMessage}</p>
          </div>
      )}

      {/* Top Toolbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 text-slate-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.BookOpen size={20} className="text-blue-500" />
            <input 
              type="text" 
              value={project.name}
              onChange={(e) => dispatch({ type: 'RENAME_PROJECT', payload: e.target.value })}
              className="bg-transparent border-none text-lg font-bold text-white focus:ring-0 focus:outline-none placeholder-slate-500 w-64"
              placeholder="Nome do Livro"
            />
          </div>
          <div className="h-6 w-[1px] bg-slate-700 mx-2"></div>
          <div className="flex gap-1">
             <button 
                onClick={() => setViewMode(ViewMode.EDIT)}
                className={`p-2 rounded hover:bg-slate-700 ${viewMode === ViewMode.EDIT ? 'bg-slate-800 text-blue-400' : ''}`}
                title="Modo Edição"
             >
                 <Icons.Layout size={18} />
             </button>
             <button 
                onClick={() => setViewMode(ViewMode.GRID)}
                className={`p-2 rounded hover:bg-slate-700 ${viewMode === ViewMode.GRID ? 'bg-slate-800 text-blue-400' : ''}`}
                title="Modo Grade/Guias"
             >
                 <Icons.Grid size={18} />
             </button>
             <button 
                onClick={() => setViewMode(ViewMode.PREVIEW)}
                className={`p-2 rounded hover:bg-slate-700 ${viewMode === ViewMode.PREVIEW ? 'bg-slate-800 text-blue-400' : ''}`}
                title="Modo Visualização"
             >
                 <Icons.Eye size={18} />
             </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
             <button 
                onClick={triggerSmartImport}
                className="group relative bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 border border-slate-600 transition-all"
             >
                 <Icons.FileUp size={14} /> 
                 Importar Arquivo
             </button>

             <button 
                onClick={runAutoLayout}
                className="group relative bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
             >
                 <Icons.Workflow size={14} className="group-hover:rotate-12 transition-transform" /> 
                 Auto-Diagramação Completa
             </button>

             <div className="h-6 w-[1px] bg-slate-700 mx-1"></div>

             {preflightStatus && (
                 <span className="text-xs text-yellow-400 animate-pulse mr-2 flex items-center gap-1">
                     <Icons.AlertTriangle size={12}/> {preflightStatus}
                 </span>
             )}
             <button 
                onClick={handlePreflight}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 flex items-center gap-2"
             >
                 <Icons.CheckCircle size={14} className="text-green-500"/> Verificação
             </button>
             <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                 <Icons.Download size={14} /> Exportar
             </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        <SidebarLeft 
            project={project} 
            onPageSelect={(id) => {
                dispatch({ type: 'SELECT_PAGE', payload: id });
                setEditingId(null);
            }}
            onAddPage={() => dispatch({ type: 'ADD_PAGE' })}
            onAssetDragStart={(e, url) => e.dataTransfer.setData('text/plain', url)}
            onAddAsset={(url) => dispatch({ type: 'ADD_ASSET_TO_LIBRARY', payload: url })}
            onRemoveAsset={(url) => dispatch({ type: 'REMOVE_ASSET_FROM_LIBRARY', payload: url })}
        />
        
        <div 
            className="flex-1 relative flex flex-col"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <EditorCanvas 
                project={project}
                activePage={activePage}
                masterPage={masterPage}
                viewMode={viewMode}
                editingId={editingId}
                onEditStart={(id) => setEditingId(id)}
                onElementSelect={(id) => {
                    dispatch({ type: 'SELECT_ELEMENT', payload: id });
                    if (!id) setEditingId(null);
                }}
                onElementUpdate={(id, updates) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates }})}
                onRemoveElement={(id) => dispatch({ type: 'REMOVE_ELEMENT', payload: id })}
            />
        </div>

        <SidebarRight 
            project={project}
            activeElement={activeElement}
            onEditStart={(id) => setEditingId(id)}
            onUpdateElement={(id, updates) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates }})}
            onUpdateStyle={(id, styleUpdates) => dispatch({ type: 'UPDATE_STYLE', payload: { id, styleUpdates }})}
            onAddSwatch={(swatch) => dispatch({ type: 'ADD_SWATCH', payload: swatch })}
            onRemoveSwatch={(id) => dispatch({ type: 'REMOVE_SWATCH', payload: id })}
            onUpdateSwatch={(swatch) => dispatch({ type: 'UPDATE_SWATCH', payload: swatch })}
            onUpdateMasterPage={(id, updates) => dispatch({ type: 'UPDATE_MASTER_PAGE', payload: { id, updates } })}
        />
      </div>
    </div>
  );
};

export default App;