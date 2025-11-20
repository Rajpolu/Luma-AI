
import { Adjustments, Layer, GradientSettings } from '../types';

/**
 * Converts a File object to a base64 data URL.
 */
export const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Strips the data URI prefix (e.g., "data:image/png;base64,") to get raw base64 bytes.
 */
export const stripBase64Prefix = (dataUri: string): string => {
  return dataUri.replace(/^data:image\/\w+;base64,/, '');
};

/**
 * Extracts the mime type from a data URI.
 */
export const getMimeTypeFromDataUri = (dataUri: string): string => {
  const match = dataUri.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : 'image/png';
};

/**
 * Downloads a data URI as a file.
 */
export const downloadImage = (dataUri: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Applies a CSS-style filter to an image data URI and returns the new data URI.
 */
export const applyImageFilter = (dataUri: string, filter: 'none' | 'grayscale' | 'sepia' | 'invert'): Promise<string> => {
  if (filter === 'none') return Promise.resolve(dataUri);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Apply filter
      if (filter === 'grayscale') {
        ctx.filter = 'grayscale(100%)';
      } else if (filter === 'sepia') {
        ctx.filter = 'sepia(100%)';
      } else if (filter === 'invert') {
        ctx.filter = 'invert(100%)';
      } else {
        ctx.filter = 'none';
      }

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL(getMimeTypeFromDataUri(dataUri)));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUri;
  });
};

/**
 * Applies advanced image adjustments (brightness, contrast, etc.) to a data URI.
 */
export const applyAdjustments = (dataUri: string, adjustments: Adjustments): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Construct CSS filter string
      // Order: Blur -> Brightness -> Contrast -> Saturation -> Hue
      const filterString = [
        `blur(${adjustments.blur}px)`,
        `brightness(${adjustments.brightness}%)`,
        `contrast(${adjustments.contrast}%)`,
        `saturate(${adjustments.saturation}%)`,
        `hue-rotate(${adjustments.hue}deg)`
      ].join(' ');

      ctx.filter = filterString;

      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL(getMimeTypeFromDataUri(dataUri)));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUri;
  });
};

/**
 * Applies a gradient overlay to the image.
 */
export const applyGradient = (dataUri: string, settings: GradientSettings): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Create Gradient
      let gradient;
      const width = canvas.width;
      const height = canvas.height;

      if (settings.type === 'linear') {
        // Calculate gradient vector based on angle
        const angleRad = (settings.angle * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.sqrt(width * width + height * height) / 2;

        const x1 = cx - r * Math.sin(angleRad);
        const y1 = cy + r * Math.cos(angleRad);
        const x2 = cx + r * Math.sin(angleRad);
        const y2 = cy - r * Math.cos(angleRad);

        gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      } else {
        // Radial Gradient
        const r = Math.max(width, height) / 1.5; 
        gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, r);
      }

      gradient.addColorStop(0, settings.startColor);
      gradient.addColorStop(1, settings.endColor);

      ctx.globalAlpha = settings.opacity / 100;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      resolve(canvas.toDataURL(getMimeTypeFromDataUri(dataUri)));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUri;
  });
};

/**
 * Merges a drawing layer (overlay) onto the base image.
 */
export const mergeImages = (baseImageUri: string, overlayImageUri: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const baseImg = new Image();
    
    baseImg.onload = () => {
      const overlayImg = new Image();
      
      overlayImg.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Draw base image
        ctx.drawImage(baseImg, 0, 0);
        
        // Draw overlay image
        ctx.drawImage(overlayImg, 0, 0);
        
        resolve(canvas.toDataURL(getMimeTypeFromDataUri(baseImageUri)));
      };
      
      overlayImg.onerror = (e) => reject(e);
      overlayImg.src = overlayImageUri;
    };
    
    baseImg.onerror = (e) => reject(e);
    baseImg.src = baseImageUri;
  });
};

/**
 * Composites all layers into a single image.
 * @param layers The stack of layers
 * @param width The width of the canvas (usually base layer width)
 * @param height The height of the canvas
 */
export const composeLayers = (
    layers: Layer[],
    width: number,
    height: number
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
        }

        // Iterate through layers from bottom to top
        for (const layer of layers) {
            if (!layer.visible) continue;

            ctx.save();
            ctx.globalAlpha = layer.opacity / 100;
            
            // Move to layer position and rotate
            // Note: Transforms in the app are relative to the layer's top-left
            // We need to translate to the position, then rotate
            
            if (layer.type === 'image' || layer.type === 'drawing') {
                 if (layer.src) {
                     try {
                         const img = await loadImage(layer.src);
                         
                         // Position
                         const x = layer.x;
                         const y = layer.y;
                         
                         // Rotation pivot is usually center of the object, 
                         // but in our simple DOM model it's top-left or center depending on CSS.
                         // Let's assume standard top-left based drawing for now, or basic center rotation.
                         // Simplification: rotate around the center of the image rect
                         
                         const w = (layer.width || img.width) * layer.scale;
                         const h = (layer.height || img.height) * layer.scale;
                         
                         if (layer.rotation !== 0) {
                            // Move to center of object
                            ctx.translate(x + w/2, y + h/2);
                            ctx.rotate((layer.rotation * Math.PI) / 180);
                            ctx.translate(-(x + w/2), -(y + h/2));
                         }

                         ctx.drawImage(img, x, y, w, h);
                     } catch (e) {
                         console.error(`Failed to load layer ${layer.id}`, e);
                     }
                 }
            } else if (layer.type === 'text' && layer.text) {
                 const fontSize = (layer.fontSize || 32) * layer.scale;
                 ctx.font = `${layer.fontWeight || 'normal'} ${fontSize}px ${layer.fontFamily || 'sans-serif'}`;
                 ctx.fillStyle = layer.color || '#ffffff';
                 ctx.textBaseline = 'top';
                 
                 // Position
                 const x = layer.x;
                 const y = layer.y;
                 
                 if (layer.rotation !== 0) {
                     // For text, rotating around the anchor point (top-left) is standard in this simple impl
                     ctx.translate(x, y);
                     ctx.rotate((layer.rotation * Math.PI) / 180);
                     ctx.fillText(layer.text, 0, 0);
                 } else {
                     ctx.fillText(layer.text, x, y);
                 }
            }

            ctx.restore();
        }

        resolve(canvas.toDataURL('image/png'));
    });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

/**
 * Crops an image based on coordinates.
 * @param dataUri The source image
 * @param crop The crop rectangle {x, y, width, height}
 */
export const cropImage = (
  dataUri: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Draw the slice of the original image
      ctx.drawImage(
        img, 
        crop.x, crop.y, crop.width, crop.height, // Source rectangle
        0, 0, crop.width, crop.height            // Destination rectangle
      );

      resolve(canvas.toDataURL(getMimeTypeFromDataUri(dataUri)));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUri;
  });
};
