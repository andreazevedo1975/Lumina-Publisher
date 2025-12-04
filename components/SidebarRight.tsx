
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { Project, PageElement, Unit, ColorSpace, ColorSwatch, MasterPage, ElementType } from '../types';
import { Icons } from './Icon';
import * as GeminiService from '../services/geminiService';
import { DEFAULT_TYPOGRAPHY, DEFAULT_BOX } from '../constants';

// ... existing interfaces and utils (hexToRgb, etc) ...
interface SidebarRightProps {
  project: Project;
  activeElement: PageElement | undefined;
  onUpdateElement: (id: string, updates: Partial<PageElement>) => void;
  onUpdateStyle: (id: string, styleUpdates: any) => void;
  onAddSwatch: (swatch: ColorSwatch) => void;
  onRemoveSwatch: (id: string) => void;
  onUpdateSwatch: (swatch: ColorSwatch) => void;
  onUpdateMasterPage?: (id: string, updates: Partial<MasterPage>) => void;
  onEditStart: (id: string) => void;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const rgbToCmyk = (r: number, g: number, b: number): [number, number, number, number] => {
  let c = 1 - (r / 255);
  let m = 1 - (g / 255);
  let y = 1 - (b / 255);
  let k = Math.min(c, Math.min(m, y));

  c = (c - k) / (1 - k) || 0;
  m = (m - k) / (1 - k) || 0;
  y = (y - k) / (1 - k) || 0;

  return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
};

const cmykToRgb = (c: number, m: number, y: number, k: number): [number, number, number] => {
  c = c / 100;
  m = m / 100;
  y = y / 100;
  k = k / 100;

  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return [Math.round(r), Math.round(g), Math.round(b)];
};

const SidebarRight: React.FC<SidebarRightProps> = ({ 
  project, 
  activeElement, 
  onUpdateElement, 
  onUpdateStyle, 
  onAddSwatch,
  onRemoveSwatch,
  onUpdateSwatch,
  onUpdateMasterPage,
  onEditStart
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'transform' | 'text' | 'color' | 'ai'>('transform');
  
  const [colorMode, setColorMode] = useState<ColorSpace>(ColorSpace.RGB);
  const [targetProp, setTargetProp] = useState<'text' | 'fill' | 'border'>('text');
  const [selectedSwatchId, setSelectedSwatchId] = useState<string | null>(null);
  const [swatchName, setSwatchName] = useState<string>('');

  const [headerText, setHeaderText] = useState(project.name);
  const [headerAlign, setHeaderAlign] = useState<'left'|'center'|'right'>('center');
  const [footerText, setFooterText] = useState('{{page}}');
  const [footerAlign, setFooterAlign] = useState<'left'|'center'|'right'>('center');
  
  // ... (existing useEffects logic remains unchanged) ...
  useEffect(() => {
    if (activeElement) {
        if (activeElement.type === 'TEXT') {
            setTargetProp('text');
        } else {
            setTargetProp('fill');
        }
    }
  }, [activeElement?.id, activeElement?.type]);

  useEffect(() => {
    if (!activeElement && project.activePageId) {
        const activePage = project.pages.find(p => p.id === project.activePageId);
        if (activePage) {
             const masterPage = project.masterPages.find(mp => mp.id === activePage.masterPageId);
             if (masterPage) {
                 const header = masterPage.elements.find(el => el.id.startsWith('sys-header'));
                 const footer = masterPage.elements.find(el => el.id.startsWith('sys-footer'));
                 
                 if (header) {
                     const plainText = header.content.replace(/<[^>]*>/g, '').trim();
                     setHeaderText(plainText || headerText);
                     setHeaderAlign(header.style.textAlign || 'center');
                 } else {
                     setHeaderText('{{title}}'); 
                 }

                 if (footer) {
                     const plainText = footer.content.replace(/<[^>]*>/g, '').trim();
                     setFooterText(plainText || footerText);
                     setFooterAlign(footer.style.textAlign || 'center');
                 }
             }
        }
    }
  }, [activeElement, project.activePageId, project.masterPages]);

  useEffect(() => {
    if (selectedSwatchId) {
        const swatch = project.swatches.find(s => s.id === selectedSwatchId);
        if (swatch) {
            setSwatchName(swatch.name);
        }
    } else {
        setSwatchName(`Amostra ${project.swatches.length + 1}`);
    }
  }, [selectedSwatchId, project.swatches]);

  // ... (existing action handlers: handleAiAltText, handleAiCopyPolish, handleClearFormat, handleIndent, toggleList, applyHeaderFooter, applyColor, handleRGBChange, etc...) ...
  const handleAiAltText = async () => {
    if (!activeElement || activeElement.type !== 'IMAGE') return;
    setAiLoading(true);
    const alt = await GeminiService.generateAltText('base64Placeholder'); 
    onUpdateElement(activeElement.id, { altText: alt });
    setAiLoading(false);
  };

  const handleAiCopyPolish = async () => {
    if (!activeElement || activeElement.type !== 'TEXT') return;
    setAiLoading(true);
    const newContent = await GeminiService.suggestCopyEdit(activeElement.content);
    onUpdateElement(activeElement.id, { content: newContent });
    setAiLoading(false);
  }

  const handleClearFormat = () => {
    if (!activeElement) return;
    onUpdateStyle(activeElement.id, {
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#1e293b'
    });
  };

  const handleIndent = (direction: 'in' | 'out') => {
    if (!activeElement) return;
    const current = activeElement.style.paddingLeft || 0;
    const step = 20;
    const next = direction === 'in' ? current + step : Math.max(0, current - step);
    onUpdateStyle(activeElement.id, { paddingLeft: next });
  };

  const toggleList = (type: 'ul' | 'ol') => {
      if (!activeElement) return;
      let content = activeElement.content;
      if (content.includes(`<${type}>`)) {
          content = content.replace(new RegExp(`<${type}>`, 'g'), '').replace(new RegExp(`<\/${type}>`, 'g'), '');
          content = content.replace(/<li>/g, '').replace(/<\/li>/g, '<br/>');
      } else {
          content = `<${type}><li>${content.replace(/<br\s*\/?>/g, '</li><li>')}</li></${type}>`;
      }
      onUpdateElement(activeElement.id, { content });
  };

  const applyHeaderFooter = () => {
      if (!onUpdateMasterPage) return;
      const activePage = project.pages.find(p => p.id === project.activePageId) || project.pages[0];
      const masterPage = project.masterPages.find(mp => mp.id === activePage.masterPageId);
      if (!masterPage) return;
      const existingElements = masterPage.elements.filter(el => !el.id.startsWith('sys-header') && !el.id.startsWith('sys-footer'));
      const newElements: PageElement[] = [...existingElements];
      if (headerText.trim()) {
          newElements.push({
              id: `sys-header-${Date.now()}`,
              type: ElementType.TEXT,
              content: `<p style="color: #64748b;">${headerText}</p>`,
              style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, textAlign: headerAlign, fontSize: 10, color: '#64748b' },
              x: 50, y: 30, width: project.width - 100, height: 20, rotation: 0, locked: true
          });
      }
      if (footerText.trim()) {
         newElements.push({
              id: `sys-footer-${Date.now()}`,
              type: ElementType.TEXT,
              content: `<p style="color: #64748b;">${footerText}</p>`,
              style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, textAlign: footerAlign, fontSize: 10, color: '#64748b' },
              x: 50, y: project.height - 40, width: project.width - 100, height: 20, rotation: 0, locked: true
          });
      }
      onUpdateMasterPage(masterPage.id, { elements: newElements });
  };

  const getCurrentColorHex = (): string => {
      if (!activeElement) return '#000000';
      if (targetProp === 'text') return activeElement.style.color;
      if (targetProp === 'fill') return activeElement.style.backgroundColor;
      if (targetProp === 'border') return activeElement.style.borderColor;
      return '#000000';
  };

  const applyColor = (hex: string) => {
      if (!activeElement) return;
      if (targetProp === 'text') onUpdateStyle(activeElement.id, { color: hex });
      if (targetProp === 'fill') onUpdateStyle(activeElement.id, { backgroundColor: hex });
      if (targetProp === 'border') onUpdateStyle(activeElement.id, { borderColor: hex });
      const match = project.swatches.find(s => s.value.toLowerCase() === hex.toLowerCase());
      if (match) { setSelectedSwatchId(match.id); setColorMode(match.space); } else { setSelectedSwatchId(null); }
  };

  const handleRGBChange = (component: 'r'|'g'|'b', val: number) => {
     const currentHex = getCurrentColorHex();
     const [r, g, b] = hexToRgb(currentHex);
     const newRgb = { r, g, b, [component]: val };
     applyColor(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const handleCMYKChange = (component: 'c'|'m'|'y'|'k', val: number) => {
     const currentHex = getCurrentColorHex();
     const [r, g, b] = hexToRgb(currentHex);
     const [c, m, y, k] = rgbToCmyk(r, g, b);
     const newCmyk = { c, m, y, k, [component]: val };
     const [nr, ng, nb] = cmykToRgb(newCmyk.c, newCmyk.m, newCmyk.y, newCmyk.k);
     applyColor(rgbToHex(nr, ng, nb));
  };

  const saveSwatch = () => {
      const hex = getCurrentColorHex();
      const [r, g, b] = hexToRgb(hex);
      const components = colorMode === ColorSpace.RGB ? [r, g, b] : rgbToCmyk(r,g,b);
      const name = swatchName.trim() || `Amostra ${project.swatches.length + 1}`;
      const newSwatch: ColorSwatch = { id: `sw-${Date.now()}`, name: name, value: hex, space: colorMode, components: components };
      onAddSwatch(newSwatch);
      setSelectedSwatchId(newSwatch.id);
  };

  const updateSelectedSwatch = () => {
      if (!selectedSwatchId) return;
      const swatch = project.swatches.find(s => s.id === selectedSwatchId);
      if (!swatch) return;
      const hex = getCurrentColorHex();
      const [r, g, b] = hexToRgb(hex);
      const components = colorMode === ColorSpace.RGB ? [r, g, b] : rgbToCmyk(r,g,b);
      onUpdateSwatch({ ...swatch, name: swatchName.trim() || swatch.name, value: hex, space: colorMode, components: components });
  };

  const handleSwatchClick = (swatch: ColorSwatch) => {
      setSelectedSwatchId(swatch.id);
      setColorMode(swatch.space);
      setSwatchName(swatch.name);
      if (activeElement) {
          if (targetProp === 'text') onUpdateStyle(activeElement.id, { color: swatch.value });
          if (targetProp === 'fill') onUpdateStyle(activeElement.id, { backgroundColor: swatch.value });
          if (targetProp === 'border') onUpdateStyle(activeElement.id, { borderColor: swatch.value });
      }
  };

  if (!activeElement) {
    // ... existing master page render ...
    const activePage = project.pages.find(p => p.id === project.activePageId);
    const masterPage = activePage ? project.masterPages.find(mp => mp.id === activePage.masterPageId) : null;
    return (
      <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full text-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
         <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-2">
            <Icons.Layout size={14} className="text-blue-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Configuração da Página</span>
         </div>
         <div className="p-4 space-y-6">
             {/* ... Master Page controls ... */}
             <div className="space-y-1 bg-slate-800 p-3 rounded border border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Página Mestra Ativa</span>
                <div className="text-sm font-medium text-white">{masterPage?.name || 'Nenhuma'}</div>
             </div>
             {/* ... Header / Footer Sections ... */}
             <div className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-400 border-b border-slate-700 pb-1">
                     <Icons.PanelTop size={14} />
                     <h3 className="text-xs font-bold">CABEÇALHO (Header)</h3>
                 </div>
                 <div className="space-y-2">
                     <label className="text-[10px] text-slate-500">Texto</label>
                     <input type="text" value={headerText} onChange={(e) => setHeaderText(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200 focus:border-blue-500 outline-none" placeholder="Ex: Nome do Livro" />
                     <button onClick={() => setHeaderText('{{title}}')} className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"><Icons.Sparkles size={8} /> Inserir Nome do Livro</button>
                     <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                        <button onClick={() => setHeaderAlign('left')} className={`flex-1 py-1 rounded flex justify-center ${headerAlign === 'left' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignLeft size={12}/></button>
                        <button onClick={() => setHeaderAlign('center')} className={`flex-1 py-1 rounded flex justify-center ${headerAlign === 'center' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignCenter size={12}/></button>
                        <button onClick={() => setHeaderAlign('right')} className={`flex-1 py-1 rounded flex justify-center ${headerAlign === 'right' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignRight size={12}/></button>
                     </div>
                 </div>
             </div>
             <div className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-400 border-b border-slate-700 pb-1">
                     <Icons.PanelBottom size={14} />
                     <h3 className="text-xs font-bold">RODAPÉ (Footer)</h3>
                 </div>
                 <div className="space-y-2">
                     <label className="text-[10px] text-slate-500">Texto</label>
                     <div className="relative">
                        <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200 focus:border-blue-500 outline-none" placeholder="Ex: {{page}}" />
                        <div className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">{'{{page}}'} = Nº Pág</div>
                     </div>
                     <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                        <button onClick={() => setFooterAlign('left')} className={`flex-1 py-1 rounded flex justify-center ${footerAlign === 'left' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignLeft size={12}/></button>
                        <button onClick={() => setFooterAlign('center')} className={`flex-1 py-1 rounded flex justify-center ${footerAlign === 'center' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignCenter size={12}/></button>
                        <button onClick={() => setFooterAlign('right')} className={`flex-1 py-1 rounded flex justify-center ${footerAlign === 'right' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`}><Icons.AlignRight size={12}/></button>
                     </div>
                 </div>
             </div>
             <button onClick={applyHeaderFooter} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow flex items-center justify-center gap-2 transition-colors mt-4"><Icons.CheckCircle size={14} /> Aplicar na Mestra</button>
         </div>
      </div>
    );
  }

  const currentHex = getCurrentColorHex();
  const rgb = hexToRgb(currentHex);
  const cmyk = rgbToCmyk(rgb[0], rgb[1], rgb[2]);

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full text-slate-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
      
      {/* ... Headers ... */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
           {activeElement.type === 'TEXT' && <><Icons.Type size={14} /> Caixa de Texto</>}
           {activeElement.type === 'IMAGE' && <><Icons.Image size={14} /> Caixa de Imagem</>}
           {activeElement.type === 'SHAPE' && <><Icons.Move size={14} /> Objeto</>}
        </div>
      </div>

       <div className="flex border-b border-slate-700">
        <button onClick={() => setActiveTab('transform')} className={`flex-1 py-3 text-xs flex justify-center hover:bg-slate-800 ${activeTab === 'transform' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`} title="Transformar"><Icons.Move size={16}/></button>
        {activeElement.type === 'TEXT' && (
             <button onClick={() => setActiveTab('text')} className={`flex-1 py-3 text-xs flex justify-center hover:bg-slate-800 ${activeTab === 'text' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`} title="Texto"><Icons.Type size={16}/></button>
        )}
        <button onClick={() => setActiveTab('color')} className={`flex-1 py-3 text-xs flex justify-center hover:bg-slate-800 ${activeTab === 'color' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`} title="Cores"><Icons.Palette size={16}/></button>
        <button onClick={() => setActiveTab('ai')} className={`flex-1 py-3 text-xs flex justify-center hover:bg-slate-800 ${activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-500'}`} title="IA"><Icons.Sparkles size={16}/></button>
      </div>

      {activeTab === 'transform' && (
          // ... (Transform tab content remains unchanged) ...
      <div className="p-4 space-y-6">
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500">GEOMETRIA</h3>
            <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">Posição X</label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                <span className="text-slate-500 text-xs">X:</span>
                <input type="number" value={activeElement.x} onChange={(e) => onUpdateElement(activeElement.id, { x: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">Posição Y</label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                <span className="text-slate-500 text-xs">Y:</span>
                <input type="number" value={activeElement.y} onChange={(e) => onUpdateElement(activeElement.id, { y: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">Largura</label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                <span className="text-slate-500 text-xs">L:</span>
                <input type="number" value={activeElement.width} onChange={(e) => onUpdateElement(activeElement.id, { width: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 block">Altura</label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                <span className="text-slate-500 text-xs">A:</span>
                <input type="number" value={activeElement.height} onChange={(e) => onUpdateElement(activeElement.id, { height: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                </div>
            </div>
            </div>
        </div>

        <div className="border-t border-slate-700"></div>

        <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2">BORDA</h3>
             {/* ... Border controls ... */}
             <div className="flex items-center gap-3">
                 <div className="space-y-1 flex-1">
                    <label className="text-[10px] text-slate-500">Largura (px)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" min="0" max="20" 
                            value={activeElement.style.borderWidth || 0} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { borderWidth: parseInt(e.target.value) })}
                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <input 
                            type="number" 
                            value={activeElement.style.borderWidth || 0} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { borderWidth: parseInt(e.target.value) || 0 })} 
                            className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0" 
                        />
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Cor</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="color" 
                            value={activeElement.style.borderColor || '#000000'}
                            onChange={(e) => onUpdateStyle(activeElement.id, { borderColor: e.target.value })}
                            className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                        />
                    </div>
                 </div>
             </div>
             
             <div className="space-y-1">
                 <label className="text-[10px] text-slate-500">Arredondamento (px)</label>
                 <div className="flex items-center gap-2">
                     <input 
                        type="range" min="0" max="100" step="1" 
                        value={activeElement.style.borderRadius || 0} 
                        onChange={(e) => onUpdateStyle(activeElement.id, { borderRadius: parseInt(e.target.value) })}
                        className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                     <input 
                        type="number" 
                        min="0" max="100"
                        value={activeElement.style.borderRadius || 0} 
                        onChange={(e) => onUpdateStyle(activeElement.id, { borderRadius: parseInt(e.target.value) || 0 })}
                        className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0"
                     />
                 </div>
             </div>
        </div>

        {activeElement.type === 'IMAGE' && (
            <>
            <div className="border-t border-slate-700"></div>
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-500">EFEITOS DE IMAGEM</h3>
                {/* ... Image effects ... */}
                <div className="space-y-1">
                     <label className="text-[10px] text-slate-500">Brilho ({Math.round((activeElement.style.brightness || 1) * 100)}%)</label>
                     <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={activeElement.style.brightness || 1} 
                        onChange={(e) => onUpdateStyle(activeElement.id, { brightness: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                </div>
                <div className="space-y-1">
                     <label className="text-[10px] text-slate-500">Contraste ({Math.round((activeElement.style.contrast || 1) * 100)}%)</label>
                     <input 
                        type="range" min="0" max="2" step="0.1" 
                        value={activeElement.style.contrast || 1} 
                        onChange={(e) => onUpdateStyle(activeElement.id, { contrast: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                        onClick={() => onUpdateStyle(activeElement.id, { grayscale: activeElement.style.grayscale ? 0 : 1 })}
                        className={`text-[10px] py-1.5 rounded border border-slate-700 ${activeElement.style.grayscale ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        P&B
                    </button>
                    <button 
                         onClick={() => onUpdateStyle(activeElement.id, { sepia: activeElement.style.sepia ? 0 : 1 })}
                        className={`text-[10px] py-1.5 rounded border border-slate-700 ${activeElement.style.sepia ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        Sépia
                    </button>
                    <button 
                         onClick={() => onUpdateStyle(activeElement.id, { blur: activeElement.style.blur ? 0 : 4 })}
                        className={`text-[10px] py-1.5 rounded border border-slate-700 ${activeElement.style.blur ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                        Blur
                    </button>
                </div>
            </div>
            </>
        )}

        <div className="border-t border-slate-700"></div>

        <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2">MARGEM (Externa)</h3>
             <div className="grid grid-cols-2 gap-2">
                 {/* ... Margins ... */}
                 <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                     <span className="text-[10px] text-slate-500 w-4 font-bold" title="Topo">T</span>
                     <input type="number" value={activeElement.style.marginTop} onChange={(e) => onUpdateStyle(activeElement.id, { marginTop: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                     <span className="text-[10px] text-slate-500 w-4 font-bold" title="Direita">D</span>
                     <input type="number" value={activeElement.style.marginRight} onChange={(e) => onUpdateStyle(activeElement.id, { marginRight: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                     <span className="text-[10px] text-slate-500 w-4 font-bold" title="Inferior">I</span>
                     <input type="number" value={activeElement.style.marginBottom} onChange={(e) => onUpdateStyle(activeElement.id, { marginBottom: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2">
                     <span className="text-[10px] text-slate-500 w-4 font-bold" title="Esquerda">E</span>
                     <input type="number" value={activeElement.style.marginLeft} onChange={(e) => onUpdateStyle(activeElement.id, { marginLeft: parseInt(e.target.value) || 0 })} className="w-full bg-transparent border-none text-xs py-1 text-right focus:ring-0" />
                 </div>
             </div>
        </div>

        <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2">PADDING (Interno)</h3>
             <div className="space-y-2">
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 w-3 font-bold" title="Topo">T</span>
                     <input type="range" min="0" max="100" value={activeElement.style.paddingTop || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingTop: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     <input type="number" value={activeElement.style.paddingTop || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingTop: parseInt(e.target.value) || 0 })} className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 w-3 font-bold" title="Direita">D</span>
                     <input type="range" min="0" max="100" value={activeElement.style.paddingRight || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingRight: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     <input type="number" value={activeElement.style.paddingRight || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingRight: parseInt(e.target.value) || 0 })} className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 w-3 font-bold" title="Inferior">I</span>
                     <input type="range" min="0" max="100" value={activeElement.style.paddingBottom || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingBottom: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     <input type="number" value={activeElement.style.paddingBottom || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingBottom: parseInt(e.target.value) || 0 })} className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0" />
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-slate-500 w-3 font-bold" title="Esquerda">E</span>
                     <input type="range" min="0" max="100" value={activeElement.style.paddingLeft || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingLeft: parseInt(e.target.value) || 0 })} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                     <input type="number" value={activeElement.style.paddingLeft || 0} onChange={(e) => onUpdateStyle(activeElement.id, { paddingLeft: parseInt(e.target.value) || 0 })} className="w-10 bg-slate-800 border border-slate-700 rounded text-xs py-0.5 px-1 text-right focus:ring-0" />
                 </div>
             </div>
        </div>
      </div>
      )}

      {/* ... (Rest of file: Text, Color, AI Tabs) ... */}
      {activeTab === 'text' && activeElement.type === 'TEXT' && (
        <div className="p-4 space-y-4">
          
          {/* Style Toolbar (Word-like) */}
          <div className="flex items-center justify-between bg-slate-800 p-1.5 rounded border border-slate-700">
             <div className="flex gap-1">
                 <button onClick={() => onUpdateStyle(activeElement.id, { fontWeight: activeElement.style.fontWeight === 700 ? 400 : 700 })} className={`p-1 rounded ${activeElement.style.fontWeight === 700 ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`} title="Negrito"><Icons.Bold size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { fontStyle: activeElement.style.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-1 rounded ${activeElement.style.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`} title="Itálico"><Icons.Italic size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { textDecoration: activeElement.style.textDecoration === 'underline' ? 'none' : 'underline' })} className={`p-1 rounded ${activeElement.style.textDecoration === 'underline' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`} title="Sublinhado"><Icons.Underline size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { textDecoration: activeElement.style.textDecoration === 'line-through' ? 'none' : 'line-through' })} className={`p-1 rounded ${activeElement.style.textDecoration === 'line-through' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`} title="Tachado"><Icons.Strikethrough size={14}/></button>
                 <button onClick={handleClearFormat} className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Limpar Formatação"><Icons.Eraser size={14}/></button>
             </div>
          </div>

          <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase">Parágrafo</h3>
              <div className="flex bg-slate-800 rounded p-1 border border-slate-700 mb-2">
                 <button onClick={() => onUpdateStyle(activeElement.id, { textAlign: 'left' })} className={`flex-1 py-1 rounded flex justify-center ${activeElement.style.textAlign === 'left' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Esquerda"><Icons.AlignLeft size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { textAlign: 'center' })} className={`flex-1 py-1 rounded flex justify-center ${activeElement.style.textAlign === 'center' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Centro"><Icons.AlignCenter size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { textAlign: 'right' })} className={`flex-1 py-1 rounded flex justify-center ${activeElement.style.textAlign === 'right' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Direita"><Icons.AlignRight size={14}/></button>
                 <button onClick={() => onUpdateStyle(activeElement.id, { textAlign: 'justify' })} className={`flex-1 py-1 rounded flex justify-center ${activeElement.style.textAlign === 'justify' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Justificado"><Icons.AlignJustify size={14}/></button>
              </div>

              <div className="flex bg-slate-800 rounded p-1 border border-slate-700">
                 <button onClick={() => toggleList('ul')} className="flex-1 py-1 rounded flex justify-center text-slate-500 hover:text-white hover:bg-slate-700" title="Lista com Marcadores"><Icons.List size={14}/></button>
                 <button onClick={() => toggleList('ol')} className="flex-1 py-1 rounded flex justify-center text-slate-500 hover:text-white hover:bg-slate-700" title="Lista Numerada"><Icons.ListOrdered size={14}/></button>
                 <div className="w-[1px] h-4 bg-slate-600 mx-1 self-center"></div>
                 <button onClick={() => handleIndent('out')} className="flex-1 py-1 rounded flex justify-center text-slate-500 hover:text-white hover:bg-slate-700" title="Diminuir Recuo"><Icons.Outdent size={14}/></button>
                 <button onClick={() => handleIndent('in')} className="flex-1 py-1 rounded flex justify-center text-slate-500 hover:text-white hover:bg-slate-700" title="Aumentar Recuo"><Icons.Indent size={14}/></button>
              </div>
          </div>
          
          <div className="space-y-3">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase">Fonte</h3>
             <select 
                className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200"
                value={activeElement.style.fontFamily}
                onChange={(e) => onUpdateStyle(activeElement.id, { fontFamily: e.target.value })}
             >
                <optgroup label="Serif (Clássico)">
                    <option value="Merriweather">Merriweather</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Lora">Lora</option>
                    <option value="PT Serif">PT Serif</option>
                    <option value="Crimson Text">Crimson Text</option>
                    <option value="Libre Baskerville">Libre Baskerville</option>
                    <option value="EB Garamond">EB Garamond</option>
                    <option value="Bitter">Bitter</option>
                </optgroup>
                <optgroup label="Sans Serif (Moderno)">
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Source Sans 3">Source Sans 3</option>
                    <option value="Oswald">Oswald</option>
                    <option value="Raleway">Raleway</option>
                    <option value="Nunito">Nunito</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Merriweather Sans">Merriweather Sans</option>
                </optgroup>
                <optgroup label="Display (Decorativo)">
                    <option value="Dancing Script">Dancing Script</option>
                    <option value="Cinzel">Cinzel</option>
                    <option value="Lobster">Lobster</option>
                </optgroup>
             </select>

             <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                   <Icons.Type size={14} className="text-slate-500" />
                   <input type="number" value={activeElement.style.fontSize} onChange={(e) => onUpdateStyle(activeElement.id, { fontSize: parseFloat(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1 px-2" />
                </div>
                 <div className="flex items-center gap-2" title="Entrelinha / Line Height">
                   <Icons.AlignJustify size={14} className="text-slate-500 rotate-90" />
                   <input type="number" step="0.1" value={activeElement.style.lineHeight} onChange={(e) => onUpdateStyle(activeElement.id, { lineHeight: parseFloat(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1 px-2" />
                </div>
             </div>
             
             <div className="space-y-4 pt-2">
                 <div className="space-y-1">
                    <div className="flex justify-between">
                        <label className="text-[10px] text-slate-500" title="Ajuste o espaçamento entre caracteres (Tracking/Kerning Manual)">Tracking / Kerning</label>
                        <span className="text-[10px] text-slate-400">{activeElement.style.letterSpacing}em</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" min="-0.5" max="1.5" step="0.001" 
                            value={activeElement.style.letterSpacing} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { letterSpacing: parseFloat(e.target.value) })} 
                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                        <input 
                            type="number" step="0.001" 
                            value={activeElement.style.letterSpacing} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { letterSpacing: parseFloat(e.target.value) })} 
                            className="w-14 bg-slate-800 border border-slate-700 rounded text-[10px] py-0.5 px-1 text-center font-mono" 
                        />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <div className="flex justify-between">
                        <label className="text-[10px] text-slate-500" title="Ajuste o espaçamento entre palavras">Word Spacing (Palavras)</label>
                        <span className="text-[10px] text-slate-400">{activeElement.style.wordSpacing || 0}em</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="range" min="-0.5" max="3" step="0.001" 
                            value={activeElement.style.wordSpacing || 0} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { wordSpacing: parseFloat(e.target.value) })} 
                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                        <input 
                            type="number" step="0.001" 
                            value={activeElement.style.wordSpacing || 0} 
                            onChange={(e) => onUpdateStyle(activeElement.id, { wordSpacing: parseFloat(e.target.value) })} 
                            className="w-14 bg-slate-800 border border-slate-700 rounded text-[10px] py-0.5 px-1 text-center font-mono" 
                        />
                    </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-[10px] text-slate-500">Kerning Óptico (Métrica da Fonte)</label>
                     <select value={activeElement.style.fontKerning || 'normal'} onChange={(e) => onUpdateStyle(activeElement.id, { fontKerning: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1 px-2">
                        <option value="auto">Auto (Browser)</option>
                        <option value="normal">Normal (Métrica)</option>
                        <option value="none">Nenhum</option>
                     </select>
                 </div>
             </div>

             <div className="space-y-2">
                 <label className="text-[10px] text-slate-500">Hifenização (H&J)</label>
                 <select value={activeElement.style.hyphens} onChange={(e) => onUpdateStyle(activeElement.id, { hyphens: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1 px-2">
                    <option value="auto">Auto</option>
                    <option value="none">Nenhum</option>
                    <option value="manual">Manual</option>
                 </select>

                 {/* Advanced Hyphenation Controls */}
                 {activeElement.style.hyphens !== 'none' && (
                     <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2 rounded border border-slate-700/50 mt-1">
                         <div className="space-y-1">
                             <label className="text-[9px] text-slate-500 block" title="Mínimo de caracteres antes do hífen">Min. Antes</label>
                             <input 
                                type="number" min="1" max="10" 
                                value={activeElement.style.hyphenateLimitCharsBefore || 3} 
                                onChange={(e) => onUpdateStyle(activeElement.id, { hyphenateLimitCharsBefore: parseInt(e.target.value) || 2 })} 
                                className="w-full bg-slate-700 border border-slate-600 rounded text-[10px] py-0.5 px-1 text-center" 
                             />
                         </div>
                         <div className="space-y-1">
                             <label className="text-[9px] text-slate-500 block" title="Mínimo de caracteres depois do hífen">Min. Depois</label>
                             <input 
                                type="number" min="1" max="10" 
                                value={activeElement.style.hyphenateLimitCharsAfter || 3} 
                                onChange={(e) => onUpdateStyle(activeElement.id, { hyphenateLimitCharsAfter: parseInt(e.target.value) || 2 })} 
                                className="w-full bg-slate-700 border border-slate-600 rounded text-[10px] py-0.5 px-1 text-center" 
                             />
                         </div>
                         <div className="col-span-2 space-y-1">
                             <label className="text-[9px] text-slate-500 block" title="Zona de Hifenização (pixels)">Zona de Hifenização (px)</label>
                             <input 
                                type="range" min="0" max="100" 
                                value={activeElement.style.hyphenateLimitZone || 0} 
                                onChange={(e) => onUpdateStyle(activeElement.id, { hyphenateLimitZone: parseInt(e.target.value) || 0 })} 
                                className="w-full h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-blue-500" 
                             />
                         </div>
                     </div>
                 )}
             </div>

             {/* Widows & Orphans Control */}
             <div className="space-y-3 pt-2 border-t border-slate-700">
                 <h4 className="text-[10px] font-bold text-slate-500 uppercase">Controle de Fluxo (Viúvas/Órfãs)</h4>
                 <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-[10px] text-slate-500" title="Mínimo de linhas deixadas no topo da próxima página">Widows (Topo)</label>
                            <span className="text-[10px] text-slate-400">{activeElement.style.widows || 2}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                value={activeElement.style.widows || 2} 
                                onChange={(e) => onUpdateStyle(activeElement.id, { widows: parseInt(e.target.value) })} 
                                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                            />
                            <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={activeElement.style.widows || 2} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) onUpdateStyle(activeElement.id, { widows: Math.max(1, Math.min(10, val)) });
                                }} 
                                className="w-10 bg-slate-800 border border-slate-700 rounded text-[10px] py-0.5 px-1 text-center" 
                            />
                        </div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-[10px] text-slate-500" title="Mínimo de linhas deixadas no final da página anterior">Orphans (Base)</label>
                            <span className="text-[10px] text-slate-400">{activeElement.style.orphans || 2}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1" 
                                value={activeElement.style.orphans || 2} 
                                onChange={(e) => onUpdateStyle(activeElement.id, { orphans: parseInt(e.target.value) })} 
                                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                            />
                            <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={activeElement.style.orphans || 2} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) onUpdateStyle(activeElement.id, { orphans: Math.max(1, Math.min(10, val)) });
                                }} 
                                className="w-10 bg-slate-800 border border-slate-700 rounded text-[10px] py-0.5 px-1 text-center" 
                            />
                        </div>
                     </div>
                 </div>
             </div>
          </div>
          
          <div className="space-y-2 pt-2 border-t border-slate-700">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase">Edição Manual</h3>
              <button 
                  onClick={() => onEditStart(activeElement.id)}
                  className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs rounded border border-blue-500/50 flex items-center justify-center gap-2 transition-colors"
              >
                  <Icons.Edit size={12} /> Editar Texto na Tela
              </button>
          </div>
        </div>
      )}

      {/* ... (Existing color and AI tabs logic remains unchanged) ... */}
      {activeTab === 'color' && (
          <div className="p-4 space-y-5">
              
              <div className="flex p-1 bg-slate-800 rounded border border-slate-700">
                  {activeElement.type === 'TEXT' && (
                    <button 
                        onClick={() => setTargetProp('text')}
                        className={`flex-1 py-1 text-xs rounded ${targetProp === 'text' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        Texto
                    </button>
                  )}
                  <button 
                    onClick={() => setTargetProp('fill')}
                    className={`flex-1 py-1 text-xs rounded ${targetProp === 'fill' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Preench.
                  </button>
                  <button 
                    onClick={() => setTargetProp('border')}
                    className={`flex-1 py-1 text-xs rounded ${targetProp === 'border' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Borda
                  </button>
              </div>

              <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modo de Cor</span>
                  <div className="flex bg-slate-800 rounded p-1 border border-slate-700 w-32">
                      <button 
                        onClick={() => setColorMode(ColorSpace.RGB)} 
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${colorMode === ColorSpace.RGB ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                      >
                        RGB
                      </button>
                      <button 
                        onClick={() => setColorMode(ColorSpace.CMYK)} 
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${colorMode === ColorSpace.CMYK ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
                      >
                        CMYK
                      </button>
                  </div>
              </div>

              <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                      <div className="w-10 h-10 rounded border border-slate-600 shadow-inner" style={{ backgroundColor: currentHex }}></div>
                      <input 
                        type="text" 
                        value={currentHex} 
                        onChange={(e) => applyColor(e.target.value)} 
                        className="flex-1 bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 font-mono uppercase"
                      />
                  </div>

                  {colorMode === ColorSpace.RGB ? (
                      <div className="space-y-2">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-red-500 font-bold">R</span>
                              <input type="range" min="0" max="255" value={rgb[0]} onChange={(e) => handleRGBChange('r', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500" />
                              <span className="text-[10px] w-6 text-right">{rgb[0]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-green-500 font-bold">G</span>
                              <input type="range" min="0" max="255" value={rgb[1]} onChange={(e) => handleRGBChange('g', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500" />
                              <span className="text-[10px] w-6 text-right">{rgb[1]}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-blue-500 font-bold">B</span>
                              <input type="range" min="0" max="255" value={rgb[2]} onChange={(e) => handleRGBChange('b', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                              <span className="text-[10px] w-6 text-right">{rgb[2]}</span>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-2">
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-cyan-500 font-bold">C</span>
                              <input type="range" min="0" max="100" value={cmyk[0]} onChange={(e) => handleCMYKChange('c', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                              <span className="text-[10px] w-6 text-right">{cmyk[0]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-pink-500 font-bold">M</span>
                              <input type="range" min="0" max="100" value={cmyk[1]} onChange={(e) => handleCMYKChange('m', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                              <span className="text-[10px] w-6 text-right">{cmyk[1]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-yellow-500 font-bold">Y</span>
                              <input type="range" min="0" max="100" value={cmyk[2]} onChange={(e) => handleCMYKChange('y', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                              <span className="text-[10px] w-6 text-right">{cmyk[2]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <span className="text-[10px] w-3 text-white font-bold">K</span>
                              <input type="range" min="0" max="100" value={cmyk[3]} onChange={(e) => handleCMYKChange('k', parseInt(e.target.value))} className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-200" />
                              <span className="text-[10px] w-6 text-right">{cmyk[3]}%</span>
                          </div>
                      </div>
                  )}
              </div>

              <div className="border-t border-slate-700"></div>

              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500">AMOSTRAS GLOBAIS</h3>
                  </div>
                  
                   <div className="space-y-1">
                      <label className="text-[10px] text-slate-500">Nome da Amostra</label>
                      <input 
                         type="text" 
                         value={swatchName}
                         onChange={(e) => setSwatchName(e.target.value)}
                         placeholder="Ex: Azul Capa"
                         className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-200 focus:border-blue-500 outline-none"
                      />
                   </div>

                  <div className="grid grid-cols-5 gap-2">
                      {project.swatches.map(swatch => (
                          <div 
                            key={swatch.id}
                            className={`aspect-square rounded border cursor-pointer relative group ${selectedSwatchId === swatch.id ? 'border-white ring-1 ring-white' : 'border-slate-600 hover:border-slate-400'}`}
                            style={{ backgroundColor: swatch.value }}
                            onClick={() => handleSwatchClick(swatch)}
                            title={`${swatch.name} (${swatch.space})`}
                          >
                             <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center gap-2 rounded transition-opacity">
                                 <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSwatchClick(swatch);
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded text-white hover:text-blue-400"
                                    title="Editar"
                                 >
                                     <Icons.Edit size={12} />
                                 </button>
                                 <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if(window.confirm(`Excluir a amostra "${swatch.name}"?`)) {
                                            onRemoveSwatch(swatch.id);
                                        }
                                    }}
                                    className="p-1 hover:bg-slate-700 rounded text-white hover:text-red-400"
                                    title="Excluir"
                                 >
                                     <Icons.Trash2 size={12} />
                                 </button>
                             </div>
                          </div>
                      ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                     <button 
                        onClick={saveSwatch}
                        className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-500 flex items-center justify-center gap-1"
                     >
                        <Icons.Save size={12} /> Criar Nova
                     </button>
                     {selectedSwatchId && (
                         <button 
                            onClick={updateSelectedSwatch}
                            className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded border border-blue-400 flex items-center justify-center gap-1"
                         >
                            <Icons.RefreshCw size={12} /> Atualizar
                         </button>
                     )}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'ai' && (
        <div className="p-4 space-y-6">
           <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-center">
               <Icons.Sparkles className="mx-auto text-purple-400 mb-2" size={24} />
               <p className="text-xs text-purple-200">Lumina AI Assistant</p>
           </div>
           
           <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500">AÇÕES RÁPIDAS</h3>
              
              <button 
                onClick={handleAiAltText}
                disabled={activeElement.type !== 'IMAGE' || aiLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-between px-3 disabled:opacity-50"
              >
                 <span className="flex items-center gap-2"><Icons.Image size={14} /> Gerar Alt Text</span>
                 {aiLoading && <Icons.Loader2 size={12} className="animate-spin" />}
              </button>

              <button 
                onClick={handleAiCopyPolish}
                disabled={activeElement.type !== 'TEXT' || aiLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 flex items-center justify-between px-3 disabled:opacity-50"
              >
                 <span className="flex items-center gap-2"><Icons.FileText size={14} /> Revisão de Texto</span>
                 {aiLoading && <Icons.Loader2 size={12} className="animate-spin" />}
              </button>
           </div>
        </div>
      )}

    </div>
  );
};

export default SidebarRight;
