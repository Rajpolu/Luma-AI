
import React, { useCallback, useRef } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { fileToDataUri } from '../utils/imageUtils';
import { Layer } from '../types';

interface ImageUploaderProps {
  onImageUpload: (dataUri: string) => void;
  // If layers are provided, we render them instead of just currentImage
  layers?: Layer[];
  activeLayerId?: string | null;
  
  // Legacy support for Generate/Analyze modes
  currentImage: string | null;
  
  imageStyle?: React.CSSProperties;
  overlays?: React.ReactNode;
  onImageLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLayerClick?: (id: string, e: React.MouseEvent) => void;
  onLayerMouseDown?: (id: string, e: React.MouseEvent) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  layers,
  activeLayerId,
  currentImage, 
  imageStyle, 
  overlays,
  onImageLoad,
  onLayerClick,
  onLayerMouseDown
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const dataUri = await fileToDataUri(file);
        onImageUpload(dataUri);
      } catch (err) {
        console.error("Failed to upload", err);
      }
    }
  }, [onImageUpload]);

  const triggerFileUpload = () => {
    // Only allow main upload if no layers exist yet
    if (!layers || layers.length === 0) {
        fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerFileUpload();
    }
  };

  const hasContent = (layers && layers.length > 0) || currentImage;

  return (
    <div className="w-full h-full flex flex-col relative group">
        {hasContent ? (
             <div className="relative w-full h-full rounded-xl overflow-hidden bg-gray-900 border border-gray-700 shadow-xl flex items-center justify-center">
                <div 
                  style={{
                    ...imageStyle,
                    position: 'relative',
                    transformOrigin: 'center center',
                  }} 
                  className="relative shadow-2xl"
                >
                  {/* Render Stacked Layers */}
                  {layers && layers.length > 0 ? (
                      <>
                        {layers.map((layer, index) => {
                            if (!layer.visible) return null;
                            const isBase = index === 0;
                            const isActive = layer.id === activeLayerId;

                            return (
                                <div
                                    key={layer.id}
                                    style={{
                                        position: isBase ? 'relative' : 'absolute',
                                        left: isBase ? 0 : layer.x,
                                        top: isBase ? 0 : layer.y,
                                        zIndex: index,
                                        opacity: layer.opacity / 100,
                                        transform: `rotate(${layer.rotation}deg) scale(${layer.scale})`,
                                        transformOrigin: 'top left', // Simplification for absolute positioning
                                        pointerEvents: isBase ? 'none' : 'auto',
                                        cursor: isActive ? 'move' : 'pointer'
                                    }}
                                    onMouseDown={(e) => {
                                        // Priority handling for drag start
                                        if (!isBase && onLayerMouseDown) {
                                            onLayerMouseDown(layer.id, e);
                                        }
                                    }}
                                    onClick={(e) => {
                                        if (!isBase && onLayerClick) {
                                            onLayerClick(layer.id, e);
                                        }
                                    }}
                                    className={`${isActive && !isBase ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''}`}
                                >
                                    {layer.type === 'image' && layer.src && (
                                        <img 
                                            src={layer.src} 
                                            alt={layer.name} 
                                            onLoad={isBase ? onImageLoad : undefined}
                                            className="block select-none pointer-events-none"
                                            style={isBase ? { maxWidth: '100%', maxHeight: '100%' } : { width: layer.width, height: layer.height }}
                                            draggable={false}
                                        />
                                    )}
                                    {layer.type === 'drawing' && layer.src && (
                                        <img 
                                            src={layer.src} 
                                            alt="Drawing" 
                                            className="block select-none pointer-events-none"
                                            draggable={false}
                                        />
                                    )}
                                    {layer.type === 'text' && (
                                        <div
                                            style={{
                                                fontSize: layer.fontSize,
                                                color: layer.color,
                                                fontFamily: layer.fontFamily,
                                                fontWeight: layer.fontWeight,
                                                whiteSpace: 'nowrap',
                                                userSelect: 'none'
                                            }}
                                        >
                                            {layer.text}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                      </>
                  ) : (
                     /* Fallback for Generate/Analyze Modes */
                     <img 
                        src={currentImage || ''} 
                        alt="Uploaded content" 
                        onLoad={onImageLoad}
                        className="max-w-full max-h-full object-contain pointer-events-none select-none block"
                        draggable={false}
                    />
                  )}
                  
                  {/* Overlays (Crop, etc) sit on top of everything */}
                  {overlays}
                </div>

                {/* Replace Button (Only show if specifically single image mode or base layer empty) */}
                {(!layers || layers.length === 0) && (
                    <div className="absolute top-4 right-4 z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            className="px-4 py-2 bg-gray-900/80 backdrop-blur-md border border-gray-600 rounded-lg hover:bg-blue-600 hover:border-blue-500 text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 text-xs font-medium"
                            onClick={triggerFileUpload}
                            onKeyDown={handleKeyDown}
                            title="Replace Image"
                        >
                            <UploadCloud size={16} aria-hidden="true" />
                            <span>Replace</span>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                                tabIndex={-1}
                            />
                        </button>
                    </div>
                )}
             </div>
        ) : (
            <div 
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-2xl bg-gray-800/30 hover:bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer p-8 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                onClick={triggerFileUpload}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label="Upload an Image. Drag and drop or click to select."
            >
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <ImageIcon className="text-gray-400 group-hover:text-blue-400 transition-colors" size={32} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-gray-200">Upload an Image</h3>
                <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">
                    Drag and drop or click to select. Supports JPG, PNG.
                </p>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                    tabIndex={-1}
                />
            </div>
        )}
    </div>
  );
};

export default ImageUploader;
