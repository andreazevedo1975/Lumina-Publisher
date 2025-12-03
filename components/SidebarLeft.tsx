import React, { useState, useRef } from 'react';
import { Project, Page } from '../types';
import { Icons } from './Icon';
import * as GeminiService from '../services/geminiService';

interface SidebarLeftProps {
  project: Project;
  onPageSelect: (id: string) => void;
  onAddPage: () => void;
  onAssetDragStart: (e: React.DragEvent, url: string) => void;
  onAddAsset: (url: string) => void;
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ project, onPageSelect, onAddPage, onAssetDragStart, onAddAsset }) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'assets'>('pages');
  const [assetTab, setAssetTab] = useState<'library' | 'create'>('library');
  const [creationMode, setCreationMode] = useState<'upload' | 'ai'>('upload');
  
  // AI Generation State
  const [prompt, setPrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('cinematic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          if (evt.target?.result) {
              onAddAsset(evt.target.result as string);
              setAssetTab('library'); // Switch back to show new asset
          }
      };
      reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
      if (!prompt.trim()) return;
      setIsGenerating(true);
      setGeneratedImage(null);
      
      // Combine prompt with style for better results
      const fullPrompt = `${prompt}. Style: ${imageStyle}. High resolution, professional quality, detailed.`;

      try {
          const base64Image = await GeminiService.generateImage(fullPrompt);
          setGeneratedImage(base64Image);
      } catch (error) {
          alert("Erro ao gerar imagem. Verifique a API Key.");
      } finally {
          setIsGenerating(false);
      }
  };

  const saveGeneratedImage = () => {
      if (generatedImage) {
          onAddAsset(generatedImage);
          setGeneratedImage(null);
          setPrompt('');
          setAssetTab('library');
      }
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col h-full text-slate-300 select-none">
      {/* Main Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'pages' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'hover:bg-slate-800'}`}
        >
          <Icons.Layers size={14} /> Páginas
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'assets' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'hover:bg-slate-800'}`}
        >
          <Icons.Image size={14} /> Ativos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-600">
        {activeTab === 'pages' ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 mb-2">PÁGINAS MESTRAS</h3>
             {project.masterPages.map((mp) => (
              <div key={mp.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer text-sm">
                <div className="w-8 h-10 bg-slate-100 border border-slate-600 rounded-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-slate-200 opacity-20"></div>
                </div>
                <span>{mp.name}</span>
              </div>
            ))}

            <div className="border-t border-slate-700 my-4"></div>

            <h3 className="text-xs font-bold text-slate-500 mb-2">PÁGINAS DO DOCUMENTO</h3>
            <div className="grid grid-cols-2 gap-4">
              {project.pages.map((page, index) => (
                <div
                  key={page.id}
                  onClick={() => onPageSelect(page.id)}
                  className={`relative group cursor-pointer transition-all ${project.activePageId === page.id ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="bg-white aspect-[1/1.41] shadow-sm rounded-sm overflow-hidden relative">
                    {/* Tiny thumbnail preview simulation */}
                    <div className="absolute top-2 left-2 right-2 h-1 bg-slate-200"></div>
                    <div className="absolute top-4 left-2 right-8 h-1 bg-slate-200"></div>
                     <div className="absolute bottom-4 right-2 w-8 h-8 bg-slate-200 rounded-sm opacity-50"></div>
                  </div>
                  <div className="mt-1 flex justify-between items-center px-1">
                    <span className="text-xs font-medium text-slate-400">{index + 1}</span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-tighter">{page.masterPageId.split('-')[1]}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
                onClick={onAddPage}
                className="w-full mt-4 py-2 border border-dashed border-slate-600 rounded text-xs text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-colors"
            >
                + Adicionar Página
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Assets Sub-Tabs */}
            <div className="flex mb-4 bg-slate-800 rounded p-1 border border-slate-700">
                <button 
                    onClick={() => setAssetTab('library')}
                    className={`flex-1 py-1.5 text-xs rounded transition-all ${assetTab === 'library' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    Biblioteca
                </button>
                <button 
                    onClick={() => setAssetTab('create')}
                    className={`flex-1 py-1.5 text-xs rounded transition-all flex items-center justify-center gap-1 ${assetTab === 'create' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Icons.ImagePlus size={12} /> Novo
                </button>
            </div>

            {assetTab === 'library' ? (
                <div className="grid grid-cols-2 gap-2 pb-4">
                    {project.assets.map((url, idx) => (
                    <div 
                        key={idx} 
                        className="aspect-square bg-slate-800 rounded border border-slate-700 overflow-hidden cursor-move hover:border-slate-500 hover:shadow-lg transition-all"
                        draggable
                        onDragStart={(e) => onAssetDragStart(e, url)}
                        title="Arraste para a página"
                    >
                        <img src={url} alt="asset" className="w-full h-full object-cover pointer-events-none" />
                    </div>
                    ))}
                    {project.assets.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                            Sua biblioteca está vazia.
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Creation Source Switch */}
                     <div className="flex gap-4 border-b border-slate-700 pb-2">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                                type="radio" 
                                name="creationMode" 
                                checked={creationMode === 'upload'} 
                                onChange={() => setCreationMode('upload')}
                                className="accent-blue-500"
                            />
                            <span>Upload Arquivo</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                                type="radio" 
                                name="creationMode" 
                                checked={creationMode === 'ai'} 
                                onChange={() => setCreationMode('ai')}
                                className="accent-purple-500"
                            />
                            <span className="flex items-center gap-1 text-purple-400 font-medium"><Icons.Sparkles size={10} /> Criar com IA</span>
                        </label>
                     </div>

                     {creationMode === 'upload' ? (
                         <div className="flex flex-col gap-4 items-center justify-center border-2 border-dashed border-slate-700 rounded-lg p-6 hover:border-slate-500 transition-colors bg-slate-800/50">
                             <Icons.UploadCloud size={32} className="text-slate-500" />
                             <div className="text-center">
                                 <p className="text-xs text-slate-400 mb-2">Arraste ou clique para upload</p>
                                 <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-1.5 px-4 rounded border border-slate-500"
                                 >
                                     Selecionar Imagem
                                 </button>
                             </div>
                             <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload}
                             />
                         </div>
                     ) : (
                         <div className="flex flex-col gap-3">
                             <label className="text-xs text-slate-400 font-medium">Prompt da Imagem</label>
                             <textarea 
                                className="w-full bg-slate-800 border border-slate-700 rounded text-xs p-2 min-h-[80px] text-slate-300 focus:border-purple-500 outline-none resize-none"
                                placeholder="Descreva a imagem que você deseja criar..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                             />

                             <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">Estilo Visual</label>
                                <select 
                                    value={imageStyle}
                                    onChange={(e) => setImageStyle(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded text-xs py-1.5 px-2 text-slate-300 focus:border-purple-500 outline-none"
                                >
                                    <option value="cinematic">Cinematográfico (Padrão)</option>
                                    <option value="photorealistic">Fotorealista</option>
                                    <option value="illustration">Ilustração Digital</option>
                                    <option value="watercolor">Aquarela</option>
                                    <option value="pencil sketch">Desenho a Lápis</option>
                                    <option value="3d render">Render 3D</option>
                                    <option value="pixel art">Pixel Art</option>
                                    <option value="oil painting">Pintura a Óleo</option>
                                </select>
                             </div>
                             
                             <button 
                                onClick={handleGenerateImage}
                                disabled={isGenerating || !prompt.trim()}
                                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                             >
                                 {isGenerating ? (
                                     <><Icons.Loader2 size={14} className="animate-spin" /> Gerando...</>
                                 ) : (
                                     <><Icons.Wand2 size={14} /> Gerar Imagem</>
                                 )}
                             </button>

                             {generatedImage && (
                                 <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                     <div className="text-[10px] text-slate-500 uppercase font-bold flex justify-between">
                                         <span>Preview</span>
                                         <span className="text-purple-400 font-normal normal-case">{imageStyle}</span>
                                     </div>
                                     <div className="aspect-square rounded border border-purple-500/50 overflow-hidden relative group">
                                         <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                                     </div>
                                     <button 
                                        onClick={saveGeneratedImage}
                                        className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded font-medium flex items-center justify-center gap-2"
                                     >
                                         <Icons.CheckCircle size={14} /> Adicionar à Biblioteca
                                     </button>
                                 </div>
                             )}
                         </div>
                     )}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarLeft;