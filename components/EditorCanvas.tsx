
import React, { useRef, useState, useEffect } from 'react';
import { Project, Page, MasterPage, PageElement, ViewMode } from '../types';
import { Icons } from './Icon';

interface EditorCanvasProps {
  project: Project;
  activePage: Page;
  masterPage: MasterPage;
  viewMode: ViewMode;
  editingId: string | null;
  onEditStart: (id: string | null) => void;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (id: string, updates: Partial<PageElement>) => void;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({ 
  project, 
  activePage, 
  masterPage, 
  viewMode,
  editingId,
  onEditStart,
  onElementSelect,
  onElementUpdate 
}) => {
  // Start with 60% zoom to ensure visibility on smaller screens
  const [zoom, setZoom] = useState(0.6);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Element Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, element: PageElement) => {
    e.stopPropagation();
    
    // If we are currently editing THIS element, allow default mouse behavior (text selection)
    // Do not start dragging.
    if (editingId === element.id) {
        return;
    }

    onElementSelect(element.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: element.x, y: element.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && project.activeElementId && !editingId) {
       const dx = (e.clientX - dragStart.x) / zoom;
       const dy = (e.clientY - dragStart.y) / zoom;
       
       onElementUpdate(project.activeElementId, {
         x: elementStart.x + dx,
         y: elementStart.y + dy
       });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Focus management for text editing
  useEffect(() => {
    if (editingId) {
        const el = document.getElementById(`editable-${editingId}`);
        if (el) {
            el.focus();
        }
    }
  }, [editingId]);

  // --- WYSIWYG COMMANDS ---
  const executeCommand = (command: string) => {
    document.execCommand(command, false, undefined);
  };

  const FloatingToolbar = ({ elementId }: { elementId: string }) => (
      <div 
        className="absolute -top-12 left-0 z-[100] flex bg-slate-900 border border-slate-700 rounded shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
      >
          <button onClick={() => executeCommand('bold')} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white border-r border-slate-700" title="Negrito"><Icons.Bold size={14} /></button>
          <button onClick={() => executeCommand('italic')} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white border-r border-slate-700" title="Itálico"><Icons.Italic size={14} /></button>
          <button onClick={() => executeCommand('underline')} className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white" title="Sublinhado"><Icons.Underline size={14} /></button>
      </div>
  );


  // Rendering an individual element
  const renderElement = (el: PageElement, isMaster: boolean = false, pageIndex?: number) => {
    const isSelected = project.activeElementId === el.id && !isMaster;
    const isEditing = editingId === el.id;

    // --- DYNAMIC CONTENT REPLACEMENT FOR MASTER ELEMENTS ---
    let displayContent = el.content;
    if (isMaster && el.type === 'TEXT' && pageIndex !== undefined) {
        displayContent = displayContent.replace(/\{\{page\}\}/gi, (pageIndex + 1).toString());
        displayContent = displayContent.replace(/\{\{total\}\}/gi, project.pages.length.toString());
        displayContent = displayContent.replace(/\{\{title\}\}/gi, project.name);
        
        // Handling [ # ] legacy placeholders if any
        displayContent = displayContent.replace(/\[\s*#\s*\]/g, (pageIndex + 1).toString());
        displayContent = displayContent.replace(/#/, (pageIndex + 1).toString()); // Simple #
    }
    // -------------------------------------------------------

    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      transform: `rotate(${el.rotation}deg)`,
      
      // Box Model
      marginTop: `${el.style.marginTop}px`,
      marginRight: `${el.style.marginRight}px`,
      marginBottom: `${el.style.marginBottom}px`,
      marginLeft: `${el.style.marginLeft}px`,
      paddingTop: `${el.style.paddingTop}px`,
      paddingRight: `${el.style.paddingRight}px`,
      paddingBottom: `${el.style.paddingBottom}px`,
      paddingLeft: `${el.style.paddingLeft}px`,
      
      // Border & Background
      borderWidth: `${el.style.borderWidth}px`,
      borderColor: el.style.borderColor,
      borderStyle: el.style.borderWidth > 0 ? 'solid' : 'none',
      backgroundColor: el.style.backgroundColor,

      // Effects
      filter: el.style.filter || 'none',

      // Typography
      fontFamily: el.style.fontFamily,
      fontSize: `${el.style.fontSize}${el.style.fontSizeUnit}`,
      lineHeight: el.style.lineHeight,
      letterSpacing: `${el.style.letterSpacing}${el.style.letterSpacingUnit}`,
      wordSpacing: `${el.style.wordSpacing}${el.style.wordSpacingUnit}`,
      fontKerning: el.style.fontKerning,
      textAlign: el.style.textAlign,
      hyphens: el.style.hyphens,
      color: el.style.color,
      
      zIndex: isSelected || isEditing ? 100 : 1,
      opacity: isMaster ? 0.5 : el.style.opacity,
      pointerEvents: isMaster ? 'none' : 'auto',
      cursor: isDragging ? 'grabbing' : isEditing ? 'text' : 'grab',
      overflow: 'hidden', // Contain text
      whiteSpace: 'pre-wrap', // Preserve newlines
      // Use solid outline for editing to match standard selection look
      outline: isEditing ? '2px solid #3b82f6' : 'none',
    };

    return (
      <div
        key={el.id}
        style={baseStyle}
        className={`group ${isSelected && !isEditing ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'}`}
        onMouseDown={(e) => !isMaster && handleMouseDown(e, el)}
        onDoubleClick={(e) => {
            if (!isMaster && el.type === 'TEXT') {
                e.stopPropagation();
                onEditStart(el.id);
                setIsDragging(false);
            }
        }}
      >
        {/* EDITING TOOLBAR */}
        {isEditing && <FloatingToolbar elementId={el.id} />}

        {isSelected && !isEditing && el.type === 'TEXT' && (
           <div className="absolute -top-8 left-0 z-50">
               <button 
                  onClick={() => onEditStart(el.id)}
                  className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded shadow flex items-center gap-1 hover:bg-blue-500"
               >
                   <Icons.Edit size={10} /> Editar Texto
               </button>
           </div>
        )}

        {el.type === 'TEXT' && (
           <div 
             id={`editable-${el.id}`}
             className="w-full h-full outline-none"
             contentEditable={isEditing}
             suppressContentEditableWarning={true}
             dangerouslySetInnerHTML={{ __html: displayContent }}
             onBlur={(e) => {
                 onEditStart(null);
                 // Only update if NOT master (master is not editable via canvas direct text edit)
                 if (!isMaster) {
                     onElementUpdate(el.id, { content: e.currentTarget.innerHTML });
                 }
             }}
             onClick={(e) => {
                 // Ensure clicks inside editable area don't bubble up weirdly
                 if(isEditing) e.stopPropagation();
             }}
             style={{ cursor: isEditing ? 'text' : 'inherit' }}
           />
        )}
        {el.type === 'IMAGE' && (
           <img src={el.content} alt={el.altText} className="w-full h-full object-cover pointer-events-none" />
        )}
        
        {/* Resize Handles (Visual Only for this demo, hidden while editing text) */}
        {isSelected && !isEditing && (
           <>
             <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white" />
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white" />
             <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white" />
             <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white" />
           </>
        )}
      </div>
    );
  };

  // Grid Visualization
  const renderGrid = () => {
    if (viewMode !== ViewMode.GRID) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none z-50 opacity-20 flex px-8" style={{ gap: masterPage.gridGutter }}>
        {Array.from({ length: masterPage.gridColumns }).map((_, i) => (
          <div key={i} className="h-full bg-pink-500 flex-1" />
        ))}
        {/* Baseline Grid */}
        <div 
          className="absolute inset-0" 
          style={{ 
             backgroundImage: `linear-gradient(to bottom, cyan 1px, transparent 1px)`,
             backgroundSize: `100% ${masterPage.baselineGrid}px`
          }}
        />
      </div>
    );
  };

  // Calculate visual dimensions for the wrapper to ensure scrollbars work correctly
  const scaledWidth = project.width * zoom;
  const scaledHeight = project.height * zoom;

  // Identify current page index for dynamic rendering
  const activePageIndex = project.pages.findIndex(p => p.id === activePage.id);

  return (
    <div className="w-full h-full relative bg-slate-800 overflow-hidden">
        
        {/* Scrollable Viewport */}
        <div 
          className="w-full h-full overflow-auto flex p-12"
          onMouseDown={(e) => {
            // only deselect if clicking background
            if(e.target === e.currentTarget) {
                onElementSelect(null);
                onEditStart(null);
            }
          }}
          onMouseMove={handleMouseMove}
        >
            {/* Centering Wrapper: margin-auto ensures centering when smaller, top-left align when larger */}
            <div 
                className="m-auto relative shrink-0 transition-all duration-75 ease-linear"
                style={{ width: scaledWidth, height: scaledHeight }}
            >
                {/* The Page Itself - Scaled from top-left */}
                <div 
                    ref={containerRef}
                    className="shadow-2xl bg-white relative origin-top-left"
                    style={{
                        width: project.width,
                        height: project.height,
                        transform: `scale(${zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {renderGrid()}
                    
                    {/* Master Page Layer - Pass pageIndex for dynamic header/footer */}
                    <div className="absolute inset-0 pointer-events-none">
                    {masterPage.elements.map(el => renderElement(el, true, activePageIndex))}
                    </div>

                    {/* Page Layer */}
                    <div className="absolute inset-0">
                    {activePage.elements.map(el => renderElement(el, false))}
                    </div>
                </div>
            </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex gap-2 bg-slate-900/90 backdrop-blur-sm p-1 rounded shadow-lg z-50 border border-slate-700">
            <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} title="Diminuir Zoom">
                <Icons.ZoomOut size={16} />
            </button>
            <span className="py-2 px-2 text-xs text-slate-300 min-w-[3.5rem] text-center font-mono border-l border-r border-slate-700">
                {Math.round(zoom * 100)}%
            </span>
            <button className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded" onClick={() => setZoom(z => Math.min(3, z + 0.1))} title="Aumentar Zoom">
                <Icons.ZoomIn size={16} />
            </button>
        </div>
    </div>
  );
};

export default EditorCanvas;
