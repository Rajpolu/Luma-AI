
import React, { useRef } from 'react';
import { Layer } from '../types';
import { Eye, EyeOff, Trash2, Lock, Unlock, GripVertical, ArrowUp, ArrowDown, ImagePlus } from 'lucide-react';
import { fileToDataUri } from '../utils/imageUtils';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onReorderLayer: (fromIndex: number, toIndex: number) => void;
  onAddImageLayer: (dataUri: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorderLayer,
  onAddImageLayer
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        try {
          const dataUri = await fileToDataUri(e.target.files[0]);
          onAddImageLayer(dataUri);
        } catch (err) {
          console.error("Failed to upload layer", err);
        }
      }
      // Reset input
      if (e.target) e.target.value = '';
  };

  // Reverse layers for display so top layer is at the top of the list
  const displayLayers = [...layers].reverse();

  return (
    <div className="bg-gray-800 w-64 border-l border-gray-700 flex flex-col h-full animate-in slide-in-from-right-10 duration-300">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between bg-gray-900/50">
        <h3 className="font-semibold text-sm text-gray-200">Layers</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-gray-700 hover:bg-blue-600 rounded text-gray-300 hover:text-white transition-colors"
          title="Add Image Layer"
        >
            <ImagePlus size={16} />
        </button>
        <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            className="hidden"
            onChange={handleImageUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {displayLayers.length === 0 ? (
            <div className="text-center text-gray-500 text-xs mt-4">No layers</div>
        ) : (
            displayLayers.map((layer) => {
                // Find original index
                const realIndex = layers.findIndex(l => l.id === layer.id);
                const isActive = activeLayerId === layer.id;

                return (
                    <div 
                        key={layer.id}
                        className={`
                            group relative flex flex-col p-2 rounded-lg border transition-all cursor-pointer
                            ${isActive 
                                ? 'bg-blue-900/20 border-blue-500/50' 
                                : 'bg-gray-700/20 border-transparent hover:bg-gray-700/50'
                            }
                        `}
                        onClick={() => onSelectLayer(layer.id)}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                title={layer.visible ? "Hide Layer" : "Show Layer"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateLayer(layer.id, { visible: !layer.visible });
                                }}
                                className={`p-1 rounded hover:bg-gray-600 transition-colors ${layer.visible ? 'text-blue-400' : 'text-gray-600'}`}
                            >
                                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>

                            <div className="flex-1 min-w-0 select-none">
                                <div className="text-xs font-medium text-gray-200 truncate">{layer.name}</div>
                                <div className="text-[10px] text-gray-500 capitalize">{layer.type}</div>
                            </div>

                            <button
                                title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateLayer(layer.id, { locked: !layer.locked });
                                }}
                                className={`p-1 rounded hover:bg-gray-600 transition-colors ${layer.locked ? 'text-red-400' : 'text-gray-600 group-hover:text-gray-400'}`}
                            >
                                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                        </div>

                        {/* Expanded Controls when active */}
                        {isActive && (
                            <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400 select-none">Op</span>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={layer.opacity}
                                        onChange={(e) => onUpdateLayer(layer.id, { opacity: Number(e.target.value) })}
                                        className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        title={`Opacity: ${layer.opacity}%`}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onReorderLayer(realIndex, realIndex + 1); }}
                                        disabled={realIndex >= layers.length - 1}
                                        className="p-1 hover:bg-gray-600 rounded text-gray-400 disabled:opacity-30 transition-colors"
                                        title="Move Up"
                                    >
                                        <ArrowUp size={12} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onReorderLayer(realIndex, realIndex - 1); }}
                                        disabled={realIndex <= 0}
                                        className="p-1 hover:bg-gray-600 rounded text-gray-400 disabled:opacity-30 transition-colors"
                                        title="Move Down"
                                    >
                                        <ArrowDown size={12} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                                        className="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400 ml-1 transition-colors"
                                        title="Delete Layer"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default LayersPanel;
