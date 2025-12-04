import React, { useState, useReducer, useEffect, useRef } from 'react';
import SidebarLeft from './components/SidebarLeft';
import SidebarRight from './components/SidebarRight';
import EditorCanvas from './components/EditorCanvas';
import { Project, PageElement, ViewMode, Unit, ElementType, ColorSwatch, Page, MasterPage } from './types';
import { INITIAL_PROJECT, DEFAULT_TYPOGRAPHY, DEFAULT_BOX, INITIAL_SWATCHES } from './constants';
import { Icons } from './components/Icon';
import * as GeminiService from './services/geminiService';
import * as EpubService from './services/epubService';

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
        if (state.assets.includes(action.payload)) return state;
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

const PreflightModal = ({ result, onClose }: { result: string | null, onClose: () => void }) => {
    if (!result) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Icons.CheckCircle className="text-green-500" /> Relatório de Verificação Editorial
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <Icons.Move size={20} className="rotate-45" /> {/* Close Icon simulated */}
                    </button>
                </div>
                <div className="p-6 overflow-y-auto font-sans text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {result}
                </div>
                <div className="bg-slate-50 p-4 border-t flex justify-end">
                    <button 
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow transition-colors"
                    >
                        Entendi, obrigado!
                    </button>
                </div>
            </div>
        </div>
    );
}

const SummaryModal = ({ summary, onClose }: { summary: string | null, onClose: () => void }) => {
    if (!summary) return null;
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(summary);
        alert("Resumo copiado!");
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Icons.BookText className="text-purple-300" /> Resumo do Livro (Gerado por IA)
                    </h3>
                    <button onClick={onClose} className="text-purple-200 hover:text-white">
                        <Icons.Move size={20} className="rotate-45" /> 
                    </button>
                </div>
                <div className="p-8 overflow-y-auto font-serif text-slate-800 leading-relaxed whitespace-pre-wrap text-lg bg-orange-50/30">
                    {summary}
                </div>
                <div className="bg-slate-50 p-4 border-t flex justify-between items-center">
                    <span className="text-xs text-slate-500">Ideal para descrição de loja ou capa.</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={copyToClipboard}
                            className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded font-medium shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Icons.Share2 size={14} /> Copiar Texto
                        </button>
                        <button 
                            onClick={onClose}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-bold shadow transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const App: React.FC = () => {
  const [project, dispatch] = useReducer(projectReducer, INITIAL_PROJECT);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);
  
  // Preflight State
  const [preflightResult, setPreflightResult] = useState<string | null>(null);
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [isPreflightLoading, setIsPreflightLoading] = useState(false);

  // Summary State
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Share State
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processando...");
  const [autoLayoutRunning, setAutoLayoutRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoExtractImages, setAutoExtractImages] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePage = project.pages.find(p => p.id === project.activePageId) || project.pages[0];
  const masterPage = project.masterPages.find(mp => mp.id === activePage.masterPageId) || project.masterPages[0];
  const activeElement = activePage.elements.find(el => el.id === project.activeElementId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataString = e.dataTransfer.getData('text/plain');
    if (dataString) {
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
      setIsPreflightLoading(true);
      const summary = `O livro se chama "${project.name}". Possui ${project.pages.length} páginas. A página atual tem ${activePage.elements.length} elementos.`;
      const result = await GeminiService.runPreflightCheck(summary);
      setPreflightResult(result);
      setShowPreflightModal(true);
      setIsPreflightLoading(false);
  };

  const handleGenerateSummary = async () => {
      setIsSummaryLoading(true);
      
      let combinedText = "";
      const sortedPages = [...project.pages].sort((a,b) => {
          const numA = parseInt(a.id.replace('page-', '')) || 0;
          const numB = parseInt(b.id.replace('page-', '')) || 0;
          return numA - numB;
      });

      sortedPages.forEach(p => {
          const sortedEls = [...p.elements].sort((a,b) => (a.y - b.y) || (a.x - b.x));
          sortedEls.forEach(el => {
              if (el.type === ElementType.TEXT) {
                  const txt = el.content.replace(/<[^>]+>/g, ' ');
                  combinedText += txt + "\n";
              }
          });
      });

      if (!combinedText.trim()) {
          alert("O projeto parece vazio. Adicione texto antes de gerar um resumo.");
          setIsSummaryLoading(false);
          return;
      }

      const summary = await GeminiService.generateBookSummary(combinedText);
      setSummaryResult(summary);
      setShowSummaryModal(true);
      setIsSummaryLoading(false);
  };

  const handleExportEpub = async () => {
      setLoadingMessage("Gerando EPUB 3...");
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 500)); 
      try {
          await EpubService.generateEpub(project);
      } catch (e) {
          console.error(e);
          alert("Falha na exportação.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleShare = () => {
      const shareLink = `https://lumina.app/share/${project.id}?ref=collaboration`;
      
      if (navigator.clipboard) {
          navigator.clipboard.writeText(shareLink).then(() => {
              setShareState('copied');
              setTimeout(() => setShareState('idle'), 2000);
          });
      } else {
          alert(`Link gerado: ${shareLink}`);
      }
  };

  const triggerSmartImport = () => {
      fileInputRef.current?.click();
  };

  // --- NEW ASYNC BATCHED LAYOUT ENGINE ---
  const layoutContentIntoPages = async (
      rawText: string, 
      images: string[], 
      projectTitle: string,
      onProgress: (msg: string) => void
  ): Promise<Page[]> => {
      const newPages: Page[] = [];
      let pageCounter = 1;

      // Configuration
      const PAGE_HEIGHT = 842;
      const MARGIN_TOP = 50;
      const MARGIN_BOTTOM = 50;
      const CONTENT_WIDTH = 495;
      const MARGIN_X = 50;
      const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

      let currentElements: PageElement[] = [];
      let currentY = MARGIN_TOP;

      const createPage = (elements: PageElement[]) => {
          newPages.push({
              id: `page-${pageCounter++}`,
              masterPageId: 'master-a',
              elements: elements
          });
      };

      const pushPage = () => {
          createPage(currentElements);
          currentElements = [];
          currentY = MARGIN_TOP;
          onProgress(`Gerando página ${pageCounter}...`);
      };

      // Create Cover Page
      createPage([
         {
             id: `el-cover-${Date.now()}`,
             type: ElementType.TEXT,
             content: `<h1 style="font-size: 3em; color: #1e293b; text-align: center; margin-top: 200px;">${projectTitle}</h1>`,
             style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize: 16 },
             x: MARGIN_X, y: 0, width: CONTENT_WIDTH, height: PAGE_HEIGHT, rotation: 0, locked: true
         }
      ]);

      // Robust paragraph splitting
      let paragraphs: string[] = [];
      // Normalize line endings
      const normalizedText = rawText.replace(/\r\n/g, '\n');
      
      if (normalizedText.includes('\n\n')) {
          paragraphs = normalizedText.split(/\n\s*\n/);
      } else {
          paragraphs = normalizedText.split(/\n/);
      }
      
      const queue = [...paragraphs];
      let iterations = 0;

      // Process Queue with larger batch size for better performance on large files
      while (queue.length > 0) {
          // Increase batch size to 50
          if (iterations % 50 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
          }
          iterations++;

          const content = queue.shift()?.trim();
          if (!content) continue;

          // Check for Headers
          const isHeader = content.startsWith('#');
          
          if (isHeader) {
              const level = content.match(/^#+/)?.[0].length || 1;
              const text = content.replace(/^#+\s*/, '');
              
              if (level === 1 && currentY > MARGIN_TOP) pushPage();
              if (level === 2 && (USABLE_HEIGHT - currentY < 200)) pushPage();

              const fontSize = level === 1 ? 24 : level === 2 ? 18 : 14;
              const estimatedHeight = level === 1 ? 60 : 40;

              currentElements.push({
                  id: `el-h-${Date.now()}-${Math.random()}`,
                  type: ElementType.TEXT,
                  content: `<h${level} style="margin: 0;">${text}</h${level}>`,
                  style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize, fontWeight: 700 },
                  x: MARGIN_X, y: currentY, width: CONTENT_WIDTH, height: estimatedHeight,
                  rotation: 0, locked: false
              });

              currentY += estimatedHeight + 10;
              continue;
          }

          // Paragraph Processing
          const fontSize = 12;
          const lineHeightPx = fontSize * 1.5;
          const charsPerLine = 85; 
          
          const totalChars = content.length;
          const lines = Math.ceil(totalChars / charsPerLine);
          const estimatedHeight = lines * lineHeightPx + 20;

          if (currentY + estimatedHeight <= (PAGE_HEIGHT - MARGIN_BOTTOM)) {
               currentElements.push({
                   id: `el-p-${Date.now()}-${Math.random()}`,
                   type: ElementType.TEXT,
                   content: `<p>${content}</p>`,
                   style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize, lineHeight: 1.5, textAlign: 'justify' },
                   x: MARGIN_X, y: currentY, width: CONTENT_WIDTH, height: estimatedHeight,
                   rotation: 0, locked: false
               });
               currentY += estimatedHeight;
          } else {
               // Needs splitting
               const remainingHeight = (PAGE_HEIGHT - MARGIN_BOTTOM) - currentY;
               
               if (remainingHeight < 40) {
                   pushPage();
                   queue.unshift(content); // Retry on new page
                   continue;
               }

               const linesFit = Math.floor((remainingHeight - 10) / lineHeightPx);
               if (linesFit <= 0) {
                    pushPage();
                    queue.unshift(content);
                    continue;
               }

               const splitIndex = Math.floor(linesFit * charsPerLine);
               let safeSplit = content.lastIndexOf(' ', splitIndex);
               
               // Robust split fallback logic
               if (safeSplit === -1 || safeSplit < splitIndex * 0.5) {
                   // If no space close enough, force split at index
                   safeSplit = splitIndex;
                   // Ensure we don't exceed content length (though logic above implies content > space)
                   if (safeSplit > content.length) safeSplit = content.length;
               }

               const partA = content.substring(0, safeSplit).trim();
               const partB = content.substring(safeSplit).trim();

               if (partA) {
                   const heightA = linesFit * lineHeightPx;
                   currentElements.push({
                       id: `el-p-split-${Date.now()}-${Math.random()}`,
                       type: ElementType.TEXT,
                       content: `<p>${partA}</p>`,
                       style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize, lineHeight: 1.5, textAlign: 'justify' },
                       x: MARGIN_X, y: currentY, width: CONTENT_WIDTH, height: heightA,
                       rotation: 0, locked: false
                   });
               }

               pushPage();
               if (partB) queue.unshift(partB); // Process remainder
          }
      }
      
      // Inject Images at the end
      if (images.length > 0) {
           pushPage();
           images.forEach((img, idx) => {
               if (currentY + 300 > (PAGE_HEIGHT - MARGIN_BOTTOM)) pushPage();
               currentElements.push({
                   id: `el-img-${idx}-${Date.now()}`,
                   type: ElementType.IMAGE,
                   content: img,
                   style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
                   x: MARGIN_X, y: currentY, width: CONTENT_WIDTH, height: 280,
                   rotation: 0, locked: false
               });
               currentY += 300;
           });
      }

      if (currentElements.length > 0) pushPage();

      return newPages;
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsProcessing(true);
      setLoadingMessage("Iniciando leitura do arquivo...");

      try {
          let textContent = '';
          let extractedImages: string[] = [];

          if (file.type === 'text/plain' || file.name.endsWith('.md')) {
               setLoadingMessage("Lendo arquivo de texto...");
               textContent = await new Promise((resolve) => {
                   const reader = new FileReader();
                   reader.onload = (evt) => resolve(evt.target?.result as string);
                   reader.readAsText(file);
               });
          } 
          else if (file.type === 'application/pdf' || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.name.endsWith('.docx')) {
               setLoadingMessage("Extraindo todo o conteúdo (isso pode levar um momento)...");
               const result = await GeminiService.parseDocumentToMarkdown(file);
               textContent = result.text;
               extractedImages = result.images;
          } else {
               alert("Formato de arquivo não suportado.");
               setIsProcessing(false);
               return;
          }

          if (autoExtractImages && extractedImages.length > 0) {
              setLoadingMessage(`Salvando ${extractedImages.length} imagens...`);
              extractedImages.forEach(img => dispatch({ type: 'ADD_ASSET_TO_LIBRARY', payload: img }));
              await new Promise(r => setTimeout(r, 200)); 
          }

          if (textContent) {
              setLoadingMessage("Diagramando páginas (Análise de fluxo)...");
              
              const newPages = await layoutContentIntoPages(
                  textContent, 
                  extractedImages, 
                  file.name.replace(/\.[^/.]+$/, ""),
                  (msg) => setLoadingMessage(msg)
              );
              
              const newProject: Project = {
                  ...INITIAL_PROJECT,
                  id: `proj-${Date.now()}`,
                  name: file.name.replace(/\.[^/.]+$/, ""),
                  pages: newPages,
                  activePageId: newPages[0]?.id || 'page-1',
                  activeElementId: null,
                  assets: Array.from(new Set([...project.assets, ...extractedImages]))
              };
              
              dispatch({ type: 'IMPORT_BOOK', payload: newProject });
          }

      } catch (error: any) {
          console.error("Import Error:", error);
          alert(`Erro ao processar: ${error?.message || "Erro desconhecido"}`);
      } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
  };

  const runAutoLayout = async () => {
      if (autoLayoutRunning) return;
      
      const confirmRun = window.confirm("Atenção: Isso irá extrair o texto atual e re-diagramar todo o projeto do zero. Continuar?");
      if (!confirmRun) return;

      setAutoLayoutRunning(true);
      setLoadingMessage("Reorganizando layout...");
      setIsProcessing(true);
      await new Promise(r => setTimeout(r, 500));

      try {
          let combinedText = "";
          let collectedImages: string[] = [];

          const sortedPages = [...project.pages].sort((a,b) => {
              const numA = parseInt(a.id.replace('page-', '')) || 0;
              const numB = parseInt(b.id.replace('page-', '')) || 0;
              return numA - numB;
          });

          sortedPages.forEach(p => {
              const sortedEls = [...p.elements].sort((a,b) => (a.y - b.y) || (a.x - b.x));
              sortedEls.forEach(el => {
                  if (el.type === ElementType.TEXT) {
                      const txt = el.content.replace(/<h[1-6][^>]*>/g, '\n# ').replace(/<\/h[1-6]>/g, '\n').replace(/<[^>]+>/g, '');
                      combinedText += txt + "\n\n";
                  } else if (el.type === ElementType.IMAGE) {
                      collectedImages.push(el.content);
                  }
              });
          });

          const newPages = await layoutContentIntoPages(
              combinedText, 
              collectedImages, 
              project.name,
              (msg) => setLoadingMessage(msg)
          );

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
      } finally {
          setIsProcessing(false);
          setAutoLayoutRunning(false);
      }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden font-sans">
      
      {showPreflightModal && (
          <PreflightModal result={preflightResult} onClose={() => setShowPreflightModal(false)} />
      )}

      {showSummaryModal && (
          <SummaryModal summary={summaryResult} onClose={() => setShowSummaryModal(false)} />
      )}

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
             <div className="flex items-center gap-2 mr-2">
                <input 
                    type="checkbox" 
                    id="autoExtract"
                    checked={autoExtractImages} 
                    onChange={(e) => setAutoExtractImages(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoExtract" className="text-xs text-slate-400 cursor-pointer select-none">
                    Extrair Imagens
                </label>
             </div>

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

             {/* SUMMARY AI */}
             <button 
                onClick={handleGenerateSummary}
                disabled={isSummaryLoading}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 flex items-center gap-2 disabled:opacity-50"
             >
                 {isSummaryLoading ? (
                     <Icons.Loader2 size={14} className="animate-spin text-purple-400" />
                 ) : (
                     <Icons.BookText size={14} className="text-purple-400"/>
                 )}
                 Resumo IA
             </button>

             {/* PREFLIGHT */}
             <button 
                onClick={handlePreflight}
                disabled={isPreflightLoading}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-600 flex items-center gap-2 disabled:opacity-50"
             >
                 {isPreflightLoading ? (
                     <Icons.Loader2 size={14} className="animate-spin text-green-500" />
                 ) : (
                     <Icons.CheckCircle size={14} className="text-green-500"/>
                 )}
                 Verificação
             </button>

             {/* SHARE BUTTON */}
             <button 
                onClick={handleShare}
                className={`text-xs font-semibold px-3 py-1.5 rounded border border-slate-600 flex items-center gap-2 transition-all ${shareState === 'copied' ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
             >
                 {shareState === 'copied' ? <Icons.CheckCircle size={14} /> : <Icons.Share2 size={14} />}
                 {shareState === 'copied' ? 'Link Copiado!' : 'Compartilhar'}
             </button>

             {/* EXPORT BUTTON */}
             <button 
                 onClick={handleExportEpub}
                 className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2"
             >
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