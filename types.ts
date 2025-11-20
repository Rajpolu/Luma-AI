
export enum AppMode {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE'
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type FilterType = 'none' | 'grayscale' | 'sepia' | 'invert';

export type Resolution = 'low' | 'medium' | 'high';

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface AnalysisResult {
  text: string;
  timestamp: number;
}

export type ProcessingStatus = 'idle' | 'loading' | 'success' | 'error';

export interface HistoryItem {
  id: string;
  image: string; // Data URI of the flattened result
  layers: Layer[]; // Snapshot of layers
  label: string;
  timestamp: number;
}

export interface Adjustments {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  hue: number;        // -180 to 180, default 0
  blur: number;       // 0-20, default 0
}

export interface GradientSettings {
  type: 'linear' | 'radial';
  startColor: string; // Hex
  endColor: string;   // Hex
  angle: number;      // 0-360, default 90
  opacity: number;    // 0-100, default 50
}

export interface BrushSettings {
  color: string;
  size: number; // 1-100
  opacity: number; // 0-100
}

export type LayerType = 'image' | 'text' | 'drawing';

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-100
  
  // Position & Transform
  x: number;
  y: number;
  rotation: number;
  scale: number;
  width?: number;
  height?: number;

  // Content
  src?: string; // For image/drawing
  text?: string; // For text
  
  // Text Specific
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
}

export interface AppState {
  mode: AppMode;
  status: ProcessingStatus;
  // The active composition state
  layers: Layer[];
  activeLayerId: string | null;
  
  // Legacy/Reference props
  uploadedImage: string | null; // Kept for canvas sizing reference (usually the bottom layer)
  originalUploadedImage: string | null; 
  
  resultImage: string | null; // Data URL
  analysisResult: string | null;
  prompt: string;
  errorMessage: string | null;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  activeFilter: FilterType;
  editHistory: HistoryItem[];
  currentHistoryIndex: number;
}
