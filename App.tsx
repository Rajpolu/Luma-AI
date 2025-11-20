import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ImageUploader from './components/ImageUploader';
import LayersPanel from './components/LayersPanel';
import PromptInput from './components/PromptInput';
import { AppMode, AppState, AspectRatio, FilterType, HistoryItem, Resolution, Adjustments, Layer, GradientSettings, BrushSettings } from './types';
import { generateImage, editImage, analyzeImage, removeBackground, upscaleImage } from './services/geminiService';
import { Download, RefreshCw, AlertCircle, Maximize2, X, Undo2, Redo2, Check, History as HistoryIcon, Scissors, SlidersHorizontal, Ban, ChevronsUp, Columns, ZoomIn, ZoomOut, RotateCcw, Type, Trash2, Plus, Palette, Eye, Circle, Paintbrush, Wand2, Crop, Layers, Loader2 } from 'lucide-react';
import { downloadImage, applyImageFilter, applyAdjustments, composeLayers, applyGradient, mergeImages, cropImage } from './utils/imageUtils';

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0
};

const DEFAULT_GRADIENT: GradientSettings = {
  type: 'linear',
  startColor: '#3b82f6', // Blue-500
  endColor: '#a855f7',   // Purple-500
  angle: 135,
  opacity: 50
};

const DEFAULT_BRUSH: BrushSettings = {
  color: '#ef4444', // Red-500
  size: 10,
  opacity: 100
};

const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Serif', value: 'Times New Roman' },
  { label: 'Mono', value: 'Courier New' },
  { label: 'Cursive', value: 'Brush Script MT' },
  { label: 'Impact', value: 'Impact' },
];

const ARTISTIC_STYLES = [
  { id: 'vangogh', label: 'Van Gogh', prompt: 'Van Gogh Starry Night impressionist oil painting style' },
  { id: 'picasso', label: 'Picasso', prompt: 'Picasso cubism abstract art style' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'soft artistic watercolor painting style' },
  { id: 'sketch', label: 'Sketch', prompt: 'detailed pencil sketch style' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'futuristic cyberpunk neon noir style' },
  { id: 'anime', label: 'Anime', prompt: 'high quality anime manga style' },
  { id: 'pixel', label: 'Pixel Art', prompt: 'retro 8-bit pixel art style' },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    mode: AppMode.GENERATE,
    status: 'idle',
    layers: [],
    activeLayerId: null,
    uploadedImage: null,
    originalUploadedImage: null,
    resultImage: null,
    analysisResult: null,
    prompt: '',
    errorMessage: null,
    aspectRatio: '1:1',
    resolution: 'high',
    activeFilter: 'none',
    editHistory: [],
    currentHistoryIndex: -1,
  });

  const [previewResult, setPreviewResult] = useState<boolean>(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isSideBySide, setIsSideBySide] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  
  // Adjustment State
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);

  // Gradient State
  const [showGradientTools, setShowGradientTools] = useState(false);
  const [gradientSettings, setGradientSettings] = useState<GradientSettings>(DEFAULT_GRADIENT);

  // Brush State
  const [showBrushTools, setShowBrushTools] = useState(false);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH);
  const [isDrawing, setIsDrawing] = useState(false);
  const brushCanvasRef = useRef<HTMLCanvasElement>(null);

  // Crop State
  const [showCropTools, setShowCropTools] = useState(false);
  const [cropSelection, setCropSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isSelectingCrop, setIsSelectingCrop] = useState(false);
  const cropStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Text State (Mapped to Layers)
  const [showTextTools, setShowTextTools] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number, naturalWidth: number, naturalHeight: number} | null>(null);

  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Remove loading screen on mount
  useEffect(() => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }, []);

  const handleModeChange = (mode: AppMode) => {
    setState(prev => ({
      ...prev,
      mode,
      resultImage: null,
      analysisResult: null,
      errorMessage: null,
      // Keep image state if switching between edit/analyze
      uploadedImage: mode === AppMode.GENERATE ? null : prev.uploadedImage,
      originalUploadedImage: mode === AppMode.GENERATE ? null : prev.originalUploadedImage,
      layers: mode === AppMode.GENERATE ? [] : prev.layers,
      editHistory: mode === AppMode.GENERATE ? [] : prev.editHistory,
      currentHistoryIndex: mode === AppMode.GENERATE ? -1 : prev.currentHistoryIndex
    }));
    setShowAdjustments(false);
    setShowTextTools(false);
    setShowGradientTools(false);
    setShowBrushTools(false);
    setShowCropTools(false);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setGradientSettings(DEFAULT_GRADIENT);
    setBrushSettings(DEFAULT_BRUSH);
    setIsSideBySide(false);
    resetZoom();
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));

  const handleWheel = (e: React.WheelEvent) => {
    if (showCropTools) return;

    if (state.mode === AppMode.EDIT || (state.mode === AppMode.GENERATE && state.resultImage)) {
      if (e.ctrlKey || e.metaKey || zoom > 1) {
         e.preventDefault();
      }
      const scaleFactor = 0.1;
      const delta = -Math.sign(e.deltaY) * scaleFactor;
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5));
    }
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    if (showCropTools || editingTextId) return;

    if (state.mode === AppMode.EDIT || state.resultImage || state.uploadedImage) {
        const panStep = 40 / zoom;
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                setPan(p => ({ ...p, y: p.y + panStep }));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setPan(p => ({ ...p, y: p.y - panStep }));
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setPan(p => ({ ...p, x: p.x + panStep }));
                break;
            case 'ArrowRight':
                e.preventDefault();
                setPan(p => ({ ...p, x: p.x - panStep }));
                break;
            case '+':
            case '=':
                e.preventDefault();
                handleZoomIn();
                break;
            case '-':
            case '_':
                e.preventDefault();
                handleZoomOut();
                break;
            case '0':
            case 'Escape':
                e.preventDefault();
                resetZoom();
                break;
            case 'Delete':
            case 'Backspace':
                if (state.activeLayerId) {
                    handleDeleteLayer(state.activeLayerId);
                }
                break;
        }
    }
  };

  const handleLayerMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const layer = state.layers.find(l => l.id === id);
    if (layer?.locked) return;
    
    setState(prev => ({ ...prev, activeLayerId: id }));
    setIsDraggingLayer(true);
    
    // Update tools context
    if (layer?.type === 'text') {
        setShowTextTools(true);
    } else {
        setShowTextTools(false);
    }
  };

  // Handles clicks on the Canvas Background
  const handleMouseDown = (e: React.MouseEvent) => {
    if (showBrushTools || showCropTools) return;
    if (isDraggingLayer) return;

    // 1. Deselect Active Layer (Clear Distractions)
    if (state.activeLayerId) {
        setState(prev => ({ ...prev, activeLayerId: null }));
        setShowTextTools(false);
    }

    // Hide Layers Panel if open (Distraction free mode)
    if (showLayersPanel) {
        setShowLayersPanel(false);
    }

    // 2. Start Canvas Panning
    if ((state.mode === AppMode.EDIT || state.resultImage) && zoom >= 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showBrushTools || showCropTools) return;

    if (isDraggingLayer && state.activeLayerId && !editingTextId) {
        e.preventDefault();
        e.stopPropagation();
        const deltaX = e.movementX / zoom;
        const deltaY = e.movementY / zoom;
        
        updateLayer(state.activeLayerId, {
            x: (state.layers.find(l => l.id === state.activeLayerId)?.x || 0) + deltaX,
            y: (state.layers.find(l => l.id === state.activeLayerId)?.y || 0) + deltaY
        });
    } else if (isDragging) {
      e.preventDefault();
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingLayer(false);
  };

  // Toggle panel visibility on double click for distraction-free mode
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (state.mode === AppMode.EDIT) {
        if (!showLayersPanel) setShowLayersPanel(true);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
     const target = e.target as HTMLImageElement;
     setImageDimensions({
         width: target.clientWidth,
         height: target.clientHeight,
         naturalWidth: target.naturalWidth,
         naturalHeight: target.naturalHeight
     });
  };

  const captureHistorySnapshot = () => {
      if (!state.uploadedImage) return;

      composeLayers(state.layers, imageDimensions?.naturalWidth || 800, imageDimensions?.naturalHeight || 800)
        .then(composite => {
             setState(prev => {
                const newHistory = prev.editHistory.slice(0, prev.currentHistoryIndex + 1);
                const newItem: HistoryItem = {
                    id: Date.now().toString(),
                    image: composite,
                    layers: JSON.parse(JSON.stringify(prev.layers)), // Deep copy
                    label: 'Action',
                    timestamp: Date.now()
                };
                newHistory.push(newItem);
                
                return {
                    ...prev,
                    editHistory: newHistory,
                    currentHistoryIndex: newHistory.length - 1
                };
             });
        });
  };

  const handleUndo = () => {
    if (state.currentHistoryIndex > 0) {
      const newIndex = state.currentHistoryIndex - 1;
      const prevItem = state.editHistory[newIndex];
      setState(prev => ({
        ...prev,
        currentHistoryIndex: newIndex,
        layers: JSON.parse(JSON.stringify(prevItem.layers)),
        resultImage: null
      }));
    }
  };

  const handleRedo = () => {
    if (state.currentHistoryIndex < state.editHistory.length - 1) {
      const newIndex = state.currentHistoryIndex + 1;
      const nextItem = state.editHistory[newIndex];
      setState(prev => ({
        ...prev,
        currentHistoryIndex: newIndex,
        layers: JSON.parse(JSON.stringify(nextItem.layers)),
        resultImage: null
      }));
    }
  };

  const handleImageUpload = (dataUri: string) => {
    // Initial Setup
    const baseLayer: Layer = {
        id: 'layer-base',
        type: 'image',
        name: 'Background',
        visible: true,
        locked: true,
        opacity: 100,
        src: dataUri,
        x: 0, y: 0, rotation: 0, scale: 1
    };

    const initialHistory: HistoryItem = {
      id: Date.now().toString(),
      image: dataUri,
      layers: [baseLayer],
      label: 'Original Upload',
      timestamp: Date.now()
    };

    setState(prev => ({ 
      ...prev, 
      uploadedImage: dataUri, 
      originalUploadedImage: dataUri, 
      activeFilter: 'none',
      resultImage: null, 
      analysisResult: null,
      layers: [baseLayer],
      activeLayerId: baseLayer.id,
      editHistory: [initialHistory],
      currentHistoryIndex: 0,
      errorMessage: null
    }));
    
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setGradientSettings(DEFAULT_GRADIENT);
    setBrushSettings(DEFAULT_BRUSH);
    setCropSelection(null);
    setShowCropTools(false);
    resetZoom();
  };

  // --- Layer Management ---

  const handleAddImageLayer = (dataUri: string) => {
      const newLayer: Layer = {
          id: `layer-${Date.now()}`,
          type: 'image',
          name: `Image ${state.layers.length + 1}`,
          visible: true,
          locked: false,
          opacity: 100,
          src: dataUri,
          x: 50, y: 50, rotation: 0, scale: 0.5, // Add smaller than bg
          width: 300, height: 300 // Default init size
      };
      
      setState(prev => ({
          ...prev,
          layers: [...prev.layers, newLayer],
          activeLayerId: newLayer.id
      }));
      captureHistorySnapshot();
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
      setState(prev => ({
          ...prev,
          layers: prev.layers.map(l => l.id === id ? { ...l, ...updates } : l)
      }));
  };

  const handleDeleteLayer = (id: string) => {
      setState(prev => ({
          ...prev,
          layers: prev.layers.filter(l => l.id !== id),
          activeLayerId: prev.activeLayerId === id ? null : prev.activeLayerId
      }));
      captureHistorySnapshot();
  };

  const handleReorderLayer = (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= state.layers.length) return;
      
      const newLayers = [...state.layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);

      setState(prev => ({ ...prev, layers: newLayers }));
      captureHistorySnapshot();
  };

  const handleLayerClick = (id: string, e: React.MouseEvent) => {
      // Kept for compatibility if needed, but logic moved to onMouseDown for better response
      e.stopPropagation();
      const layer = state.layers.find(l => l.id === id);
      if (layer && !layer.locked) {
          setState(prev => ({ ...prev, activeLayerId: id }));
          if (layer.type === 'text') setShowTextTools(true);
      }
  };

  // --- Features Wrappers ---

  const handleFilterChange = async (filter: FilterType) => {
    if (!state.uploadedImage) return;
    try {
      const baseImage = state.uploadedImage;
      const newImage = await applyImageFilter(baseImage, filter);
      
      setState(prev => ({
          ...prev,
          uploadedImage: newImage,
          layers: prev.layers.map((l, i) => i === 0 ? { ...l, src: newImage } : l)
      }));
      captureHistorySnapshot();
      setState(prev => ({ ...prev, activeFilter: 'none' })); 
    } catch (error) {
      console.error("Failed to apply filter:", error);
      setState(prev => ({ ...prev, errorMessage: "Failed to apply filter" }));
    }
  };

  const applyCurrentAdjustments = async () => {
    if (!state.uploadedImage) return;

    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const newImage = await applyAdjustments(state.uploadedImage, adjustments);
      
      setState(prev => ({
          ...prev,
          status: 'idle',
          uploadedImage: newImage,
          layers: prev.layers.map((l, i) => i === 0 ? { ...l, src: newImage } : l)
      }));
      captureHistorySnapshot();
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setShowAdjustments(false);
    } catch (error) {
       console.error("Failed to apply adjustments:", error);
       setState(prev => ({ ...prev, status: 'error', errorMessage: "Failed to apply adjustments" }));
    }
  };

  const handleAddText = () => {
      const newLayer: Layer = {
          id: `text-${Date.now()}`,
          type: 'text',
          name: 'Text Layer',
          visible: true,
          locked: false,
          opacity: 100,
          text: 'Double click to edit',
          x: 50, y: 50, rotation: 0, scale: 1,
          fontSize: 32, color: '#ffffff', fontFamily: 'Inter', fontWeight: 'bold'
      };
      
      setState(prev => ({
          ...prev,
          layers: [...prev.layers, newLayer],
          activeLayerId: newLayer.id
      }));
      setShowTextTools(true);
      setShowLayersPanel(true);
      captureHistorySnapshot();
  };

  const applyBrush = async () => {
    if (!state.uploadedImage || !brushCanvasRef.current) return;
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
        const drawingDataUri = brushCanvasRef.current.toDataURL('image/png');
        
        const newLayer: Layer = {
            id: `draw-${Date.now()}`,
            type: 'drawing',
            name: 'Brush Stroke',
            visible: true,
            locked: false,
            opacity: brushSettings.opacity,
            src: drawingDataUri,
            x: 0, y: 0, rotation: 0, scale: 1,
            width: imageDimensions?.naturalWidth,
            height: imageDimensions?.naturalHeight
        };

        setState(prev => ({
            ...prev,
            status: 'idle',
            layers: [...prev.layers, newLayer],
            activeLayerId: newLayer.id
        }));
        
        // Clear local canvas
        const ctx = brushCanvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, brushCanvasRef.current.width, brushCanvasRef.current.height);
        
        setShowBrushTools(false);
        captureHistorySnapshot();
    } catch (error) {
        console.error("Failed to apply brush:", error);
        setState(prev => ({ ...prev, status: 'error', errorMessage: "Failed to apply brush stroke" }));
    }
  };

  // Crop Handlers
  const handleCropStart = (e: React.MouseEvent) => {
      if (!showCropTools) return;
      e.preventDefault(); e.stopPropagation();
      setIsSelectingCrop(true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cropStartRef.current = { x, y };
      setCropSelection({ x, y, width: 0, height: 0 });
  };

  const handleCropMove = (e: React.MouseEvent) => {
      if (!showCropTools || !isSelectingCrop) return;
      e.preventDefault(); e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const width = currentX - cropStartRef.current.x;
      const height = currentY - cropStartRef.current.y;
      
      setCropSelection({
          x: width > 0 ? cropStartRef.current.x : currentX,
          y: height > 0 ? cropStartRef.current.y : currentY,
          width: Math.abs(width),
          height: Math.abs(height)
      });
  };

  const handleCropEnd = () => setIsSelectingCrop(false);

  const applyCurrentCrop = async () => {
      if (!cropSelection || !state.uploadedImage || !imageDimensions) return;
      
      const displayedWidth = imageDimensions.width; 
      const displayedHeight = imageDimensions.height;
      const naturalWidth = imageDimensions.naturalWidth;
      const naturalHeight = imageDimensions.naturalHeight;
      
      const scaleX = naturalWidth / displayedWidth;
      const scaleY = naturalHeight / displayedHeight;
      
      const finalCrop = {
          x: cropSelection.x * scaleX,
          y: cropSelection.y * scaleY,
          width: cropSelection.width * scaleX,
          height: cropSelection.height * scaleY
      };

      try {
          const cropped = await cropImage(state.uploadedImage, finalCrop);
          
          // Reset everything with new image
          handleImageUpload(cropped);
      } catch(e) {
          console.error(e);
          setState(prev => ({ ...prev, errorMessage: "Failed to crop image" }));
      }
  };

  const handleArtisticFilter = async (style: typeof ARTISTIC_STYLES[0]) => {
    if (!state.uploadedImage) return;
    setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));
    try {
        const fullPrompt = `Transform this image into the style of ${style.prompt}. Maintain the original composition and subject but apply the artistic style strongly.`;
        
        // We need to flatten visible layers first
        const composite = await composeLayers(state.layers, imageDimensions?.naturalWidth || 800, imageDimensions?.naturalHeight || 800);
        const resultImg = await editImage(composite, fullPrompt);
        
        setState(prev => ({
            ...prev,
            status: 'success',
            resultImage: resultImg,
            prompt: `Style: ${style.label}` 
        }));
    } catch (error: any) {
        setState(prev => ({ ...prev, status: 'error', errorMessage: error.message }));
    }
  };

  const handleAIAction = async () => {
    if (!state.prompt.trim()) return;
    setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));
    
    try {
        if (state.mode === AppMode.GENERATE) {
            const img = await generateImage(state.prompt, state.aspectRatio, state.resolution);
            setState(prev => ({ ...prev, status: 'success', resultImage: img }));
        } else if (state.mode === AppMode.ANALYZE && state.uploadedImage) {
            const analysis = await analyzeImage(state.uploadedImage, state.prompt);
             alert(analysis); 
             setState(prev => ({ ...prev, status: 'idle' }));
        }
    } catch (error: any) {
        setState(prev => ({ ...prev, status: 'error', errorMessage: error.message }));
    }
  };

  const handleDownload = async () => {
    if (state.resultImage) {
      downloadImage(state.resultImage, `lumina-${Date.now()}.png`);
    } else if (state.mode === AppMode.EDIT && state.layers.length > 0) {
        if (imageDimensions) {
            const composite = await composeLayers(state.layers, imageDimensions.naturalWidth, imageDimensions.naturalHeight);
            downloadImage(composite, `lumina-edit-${Date.now()}.png`);
        }
    }
  };

  // --- Render Helpers ---
  const canvasStyle: React.CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    cursor: showBrushTools ? 'crosshair' : showCropTools ? 'default' : isDragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
  };

  const activeLayer = state.layers.find(l => l.id === state.activeLayerId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 font-sans text-gray-100 selection:bg-blue-500/30">
      <Sidebar currentMode={state.mode} setMode={handleModeChange} />

      <main className="flex-1 flex flex-col relative overflow-hidden ml-20 transition-all duration-300">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-950/50 backdrop-blur-sm z-10 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">
              {state.mode === AppMode.GENERATE && "Generative Studio"}
              {state.mode === AppMode.EDIT && "Magic Editor"}
              {state.mode === AppMode.ANALYZE && "Visual Intelligence"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handleDownload}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400 transition-colors"
                title="Download"
              >
                <Download size={20} />
              </button>
          </div>
        </header>

        <div className="flex-1 relative flex flex-row overflow-hidden">
            
          {/* Error Toast */}
          {state.errorMessage && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-xl flex items-start gap-3 backdrop-blur-sm animate-in slide-in-from-top-5 fade-in duration-300 max-w-md">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold">Operation Failed</span>
                    <span className="text-xs opacity-90">{state.errorMessage}</span>
                    <span className="text-[10px] opacity-70 mt-1">Make sure VITE_API_KEY is set in your Vercel Environment Variables.</span>
                </div>
                <button onClick={() => setState(prev => ({ ...prev, errorMessage: null }))} className="hover:bg-white/20 rounded p-1"><X size={16}/></button>
             </div>
          )}

          {/* Canvas Area */}
          <div 
            className="group flex-1 relative p-4 md:p-8 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-gray-950 outline-none"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleCanvasKeyDown}
            tabIndex={0}
            ref={canvasRef}
          >
            
            {(state.uploadedImage || state.resultImage) && (
                <div 
                    className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-gray-900/60 backdrop-blur-md border border-gray-700/50 p-1.5 rounded-full shadow-xl"
                    onMouseDown={(e) => e.stopPropagation()} // Prevent background click when using zoom
                >
                    <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-800/50 rounded-full text-gray-300"><ZoomOut size={14} /></button>
                    <span className="text-[10px] w-8 text-center text-gray-400 font-mono">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-800/50 rounded-full text-gray-300"><ZoomIn size={14} /></button>
                     <button onClick={resetZoom} className="p-1.5 hover:bg-gray-800/50 rounded-full text-gray-300 ml-1"><RotateCcw size={14} /></button>
                </div>
            )}

            <div className="w-full max-w-6xl h-full flex flex-col gap-6 z-10 pointer-events-none">
              <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                
                {(state.mode === AppMode.EDIT || state.mode === AppMode.ANALYZE) && (
                   <div className={`flex-1 transition-all duration-500 flex flex-col relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900 pointer-events-auto ${state.resultImage ? 'hidden lg:flex' : 'flex'}`}>
                       <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                           <div className="w-full h-full relative flex items-center justify-center">
                                <ImageUploader 
                                  onImageUpload={handleImageUpload} 
                                  layers={state.layers}
                                  activeLayerId={state.activeLayerId}
                                  currentImage={state.uploadedImage}
                                  imageStyle={canvasStyle}
                                  onImageLoad={handleImageLoad}
                                  onLayerClick={handleLayerClick}
                                  onLayerMouseDown={handleLayerMouseDown}
                                  overlays={
                                    <>
                                    {/* Brush Canvas */}
                                    {showBrushTools && imageDimensions && (
                                        <canvas
                                            ref={brushCanvasRef}
                                            width={imageDimensions.naturalWidth}
                                            height={imageDimensions.naturalHeight}
                                            onMouseDown={(e) => {
                                                e.preventDefault(); e.stopPropagation();
                                                if(!brushCanvasRef.current) return;
                                                setIsDrawing(true);
                                                const ctx = brushCanvasRef.current.getContext('2d');
                                                if(ctx) {
                                                    const rect = brushCanvasRef.current.getBoundingClientRect();
                                                    const x = (e.clientX - rect.left) * (brushCanvasRef.current.width / rect.width);
                                                    const y = (e.clientY - rect.top) * (brushCanvasRef.current.height / rect.height);
                                                    ctx.beginPath(); ctx.moveTo(x, y);
                                                    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                                                    ctx.strokeStyle = brushSettings.color;
                                                    ctx.lineWidth = brushSettings.size * (brushCanvasRef.current.width / rect.width);
                                                    ctx.globalAlpha = brushSettings.opacity / 100;
                                                }
                                            }}
                                            onMouseMove={(e) => {
                                                e.preventDefault(); e.stopPropagation();
                                                if(!isDrawing || !brushCanvasRef.current) return;
                                                const ctx = brushCanvasRef.current.getContext('2d');
                                                if(ctx) {
                                                     const rect = brushCanvasRef.current.getBoundingClientRect();
                                                     const x = (e.clientX - rect.left) * (brushCanvasRef.current.width / rect.width);
                                                     const y = (e.clientY - rect.top) * (brushCanvasRef.current.height / rect.height);
                                                     ctx.lineTo(x, y); ctx.stroke();
                                                }
                                            }}
                                            onMouseUp={() => setIsDrawing(false)}
                                            style={{
                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                zIndex: 20, cursor: 'crosshair', pointerEvents: 'auto'
                                            }}
                                        />
                                    )}

                                    {/* Crop Overlay */}
                                    {showCropTools && (
                                        <div 
                                            className="absolute inset-0 z-30 cursor-crosshair"
                                            onMouseDown={handleCropStart}
                                            onMouseMove={handleCropMove}
                                            onMouseUp={handleCropEnd}
                                            onMouseLeave={handleCropEnd}
                                        >
                                            {cropSelection && (
                                                <div 
                                                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                                                    style={{
                                                        left: cropSelection.x,
                                                        top: cropSelection.y,
                                                        width: cropSelection.width,
                                                        height: cropSelection.height
                                                    }}
                                                >
                                                    <div className="absolute -top-3 -left-3 w-3 h-3 border-l-2 border-t-2 border-white"></div>
                                                    <div className="absolute -top-3 -right-3 w-3 h-3 border-r-2 border-t-2 border-white"></div>
                                                    <div className="absolute -bottom-3 -left-3 w-3 h-3 border-l-2 border-b-2 border-white"></div>
                                                    <div className="absolute -bottom-3 -right-3 w-3 h-3 border-r-2 border-b-2 border-white"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    </>
                                  }
                                />
                           </div>
                       </div>
                       
                       {/* History Controls */}
                       {state.mode === AppMode.EDIT && state.uploadedImage && (
                         <div 
                            className="bg-gray-800/80 backdrop-blur border-t border-gray-700 p-2 flex items-center justify-between z-20"
                            onMouseDown={(e) => e.stopPropagation()} // Prevent background click
                         >
                             <div className="flex items-center gap-1">
                                <button onClick={handleUndo} disabled={state.currentHistoryIndex <= 0} className="p-2 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300"><Undo2 size={18} /></button>
                                <button onClick={handleRedo} disabled={state.currentHistoryIndex >= state.editHistory.length - 1} className="p-2 rounded hover:bg-gray-700 disabled:opacity-30 text-gray-300"><Redo2 size={18} /></button>
                             </div>
                         </div>
                       )}
                   </div>
                )}

                {/* Result View */}
                {state.resultImage && (
                  <div 
                    className="flex-1 relative bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl flex flex-col pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                        <div className="flex-1 flex items-center justify-center p-2">
                        <img src={state.resultImage} alt="Result" className="max-w-full max-h-full object-contain shadow-lg" style={canvasStyle} />
                        </div>
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
                            <button onClick={() => {
                                if(state.resultImage) {
                                    handleAddImageLayer(state.resultImage);
                                    setState(prev => ({...prev, resultImage: null}));
                                }
                            }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">Keep as Layer</button>
                            <button onClick={() => setState(prev => ({...prev, resultImage: null}))} className="bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-gray-600">Discard</button>
                        </div>
                  </div>
                )}
              </div>

              {/* Tool Bar */}
              <div 
                className="w-full bg-gray-900/50 p-2 rounded-2xl backdrop-blur border border-gray-800 flex flex-col gap-2 shadow-xl z-20 pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()} // Prevent background click from toolbar
              >
                <div className="flex items-center justify-between">
                    <div className="flex-1 flex flex-nowrap overflow-x-auto gap-4 px-2 pb-2 scrollbar-none">
                    {state.mode === AppMode.EDIT && state.uploadedImage && (
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tools</span>
                                <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
                                <button onClick={() => setShowLayersPanel(!showLayersPanel)} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${showLayersPanel ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                                    <Layers size={12} /> <span>Layers</span>
                                </button>
                                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                <button onClick={() => {
                                    setShowCropTools(!showCropTools);
                                    if(!showCropTools) {
                                        setCropSelection(null);
                                        setIsSelectingCrop(false);
                                    }
                                }} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${showCropTools ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}>
                                    <Crop size={12} /> <span>Crop</span>
                                </button>
                                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                <button onClick={handleAddText} className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2">
                                    <Type size={12} /> <span>Text</span>
                                </button>
                                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                <button onClick={() => setShowBrushTools(true)} className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2">
                                    <Paintbrush size={12} /> <span>Brush</span>
                                </button>
                                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                <button onClick={() => setShowAdjustments(true)} className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-2">
                                    <SlidersHorizontal size={12} /> <span>Tune</span>
                                </button>
                                </div>
                            </div>
                            
                            {/* AI Actions */}
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">AI Styles</span>
                                <div className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700/50">
                                    {ARTISTIC_STYLES.slice(0,3).map(style => (
                                    <button 
                                        key={style.id} 
                                        onClick={() => handleArtisticFilter(style)} 
                                        disabled={state.status === 'loading'}
                                        className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white mr-1 last:mr-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-wait flex items-center gap-1"
                                    >
                                        {state.status === 'loading' && state.prompt.includes(style.label) ? <Loader2 size={10} className="animate-spin" /> : null}
                                        {style.label}
                                    </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
                
                {/* Contextual Panels */}
                {showCropTools && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex gap-4 items-center">
                         <span className="text-xs font-bold text-gray-400 uppercase">Crop Tool</span>
                         <div className="flex-1 text-xs text-gray-500">Drag on image to select area</div>
                         <button onClick={() => setShowCropTools(false)} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600 text-white"><X size={16}/></button>
                         <button onClick={applyCurrentCrop} disabled={!cropSelection} className="px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed">Apply Crop</button>
                    </div>
                )}

                {showBrushTools && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex gap-4 items-end">
                         <button onClick={() => setShowBrushTools(false)} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600"><X size={16}/></button>
                         <button onClick={applyBrush} className="p-1.5 bg-blue-600 rounded hover:bg-blue-500 text-white"><Check size={16}/></button>
                         <input type="color" value={brushSettings.color} onChange={e => setBrushSettings({...brushSettings, color: e.target.value})} className="h-8 w-8 cursor-pointer rounded bg-transparent" />
                         <input type="range" min="1" max="50" value={brushSettings.size} onChange={e => setBrushSettings({...brushSettings, size: Number(e.target.value)})} className="w-32" />
                    </div>
                )}

                {showAdjustments && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                         <div className="flex items-center justify-between col-span-full border-b border-gray-700 pb-2 mb-1">
                             <span className="text-xs font-bold text-gray-400 uppercase">Adjustments</span>
                             <div className="flex gap-2">
                                 <button onClick={() => setShowAdjustments(false)} className="p-1 rounded hover:bg-gray-700"><X size={14}/></button>
                                 <button onClick={applyCurrentAdjustments} className="px-3 py-1 bg-blue-600 rounded text-xs font-medium hover:bg-blue-500">Apply</button>
                             </div>
                         </div>
                         {Object.entries(adjustments).map(([key, value]) => (
                             <div key={key} className="flex flex-col gap-1">
                                 <div className="flex justify-between text-xs text-gray-400">
                                     <span className="capitalize">{key}</span>
                                     <span>{value}</span>
                                 </div>
                                 <input 
                                     type="range" 
                                     min={key === 'hue' ? -180 : 0} 
                                     max={key === 'blur' ? 20 : 200} 
                                     value={value} 
                                     onChange={(e) => setAdjustments({...adjustments, [key]: Number(e.target.value)})}
                                     className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                 />
                             </div>
                         ))}
                    </div>
                )}

                {showTextTools && activeLayer && activeLayer.type === 'text' && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 grid grid-cols-12 gap-2">
                         <div className="col-span-12 flex justify-between mb-2">
                             <span className="text-xs font-bold text-gray-400">Text Properties</span>
                             <button onClick={() => setShowTextTools(false)}><X size={14} className="text-gray-400"/></button>
                         </div>
                         <div className="col-span-6">
                             <input className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm" value={activeLayer.text} onChange={e => updateLayer(activeLayer.id, { text: e.target.value })} />
                         </div>
                         <div className="col-span-2">
                             <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-1 text-sm" value={activeLayer.fontSize} onChange={e => updateLayer(activeLayer.id, { fontSize: Number(e.target.value) })} />
                         </div>
                         <div className="col-span-1">
                              <input type="color" value={activeLayer.color} onChange={e => updateLayer(activeLayer.id, { color: e.target.value })} className="w-full h-8 bg-transparent cursor-pointer" />
                         </div>
                         <div className="col-span-3">
                             <input type="range" min="-180" max="180" value={activeLayer.rotation} onChange={e => updateLayer(activeLayer.id, { rotation: Number(e.target.value) })} className="w-full" />
                         </div>
                    </div>
                )}

                {!showBrushTools && !showTextTools && !showAdjustments && state.mode !== AppMode.EDIT && (
                     <PromptInput 
                        value={state.prompt} 
                        onChange={val => setState(prev => ({...prev, prompt: val}))}
                        onSubmit={handleAIAction}
                        loading={state.status === 'loading'}
                    />
                )}
              </div>
            </div>
          </div>

          {/* Layers Sidebar (Right) */}
          {showLayersPanel && state.mode === AppMode.EDIT && (
              <LayersPanel 
                layers={state.layers}
                activeLayerId={state.activeLayerId}
                onSelectLayer={(id) => {
                    setState(prev => ({ ...prev, activeLayerId: id }));
                    const layer = state.layers.find(l => l.id === id);
                    if(layer?.type === 'text') setShowTextTools(true);
                }}
                onUpdateLayer={(id, updates) => {
                    updateLayer(id, updates);
                    captureHistorySnapshot();
                }}
                onDeleteLayer={handleDeleteLayer}
                onReorderLayer={handleReorderLayer}
                onAddImageLayer={handleAddImageLayer}
              />
          )}

        </div>
      </main>
    </div>
  );
};

export default App;