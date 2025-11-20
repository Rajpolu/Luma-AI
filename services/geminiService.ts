import { GoogleGenAI, Modality } from "@google/genai";
import { stripBase64Prefix, getMimeTypeFromDataUri } from "../utils/imageUtils";

// Helper to safely get API Key from various environments without crashing
const getApiKey = (): string => {
  let key = '';
  try {
    // 1. Try Vite / Modern Browsers (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        key = import.meta.env.VITE_API_KEY || import.meta.env.NEXT_PUBLIC_API_KEY;
    }
    
    if (key) return key;

    // 2. Try Global Window Process (Shimmed environments)
    // @ts-ignore
    if (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.API_KEY) {
        // @ts-ignore
        return window.process.env.API_KEY;
    }

    // 3. Try Standard Node Process (Webpack/Node)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Error reading environment variables:", e);
  }
  return key || '';
};

const getAiClient = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
      console.error("CRITICAL: API Key is missing. AI features will not work. Please set VITE_API_KEY in your environment.");
      // Return a client that will definitely fail, but won't crash the app initialization
      return new GoogleGenAI({ apiKey: 'missing-key' });
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates an image from a text prompt.
 * Tries Imagen 4.0 first, falls back to Gemini 2.5 Flash Image if Imagen fails.
 */
export const generateImage = async (prompt: string, aspectRatio: string = '1:1', resolution: 'low' | 'medium' | 'high' = 'high'): Promise<string> => {
  const ai = getAiClient();
  
  // Attempt High-Quality Imagen Generation first
  if (resolution === 'high') {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });

        const generatedImage = response.generatedImages?.[0];
        if (generatedImage?.image?.imageBytes) {
            return `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
        }
    } catch (e) {
        console.warn("Imagen 4.0 generation failed, falling back to Flash Image.", e);
        // Fall through to standard generation
    }
  }

  // Fallback / Standard Generation (Gemini 2.5 Flash Image)
  try {
      const enhancedPrompt = `${prompt}. High quality, detailed image. Aspect ratio ${aspectRatio}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
      throw new Error("No image returned from generation operation.");
  } catch (error: any) {
      console.error("Generate Image Error:", error);
      throw new Error(error.message || "Failed to generate image. Please check your API key and quota.");
  }
};

/**
 * Edits an existing image based on a text prompt using Gemini 2.5 Flash Image.
 */
export const editImage = async (base64DataUri: string, prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const rawBase64 = stripBase64Prefix(base64DataUri);
    const mimeType = getMimeTypeFromDataUri(base64DataUri);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
    
    throw new Error("No image returned from edit operation.");
  } catch (error: any) {
    console.error("Edit Image Error:", error);
    throw new Error(error.message || "Failed to edit image");
  }
};

/**
 * Removes the background from an image using Gemini 2.5 Flash Image.
 */
export const removeBackground = async (base64DataUri: string): Promise<string> => {
  return await editImage(
    base64DataUri, 
    "Remove the background from this image. Isolate the main subject completely on a clean, transparent or white background."
  );
};

/**
 * Upscales and enhances an image using Gemini 2.5 Flash Image.
 */
export const upscaleImage = async (base64DataUri: string): Promise<string> => {
  return await editImage(
    base64DataUri,
    "Upscale this image to high resolution. Enhance details, sharpness, and clarity significantly while maintaining the original content and composition."
  );
};

/**
 * Analyzes an image and provides a text description using Gemini 2.5 Flash.
 */
export const analyzeImage = async (base64DataUri: string, prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const rawBase64 = stripBase64Prefix(base64DataUri);
    const mimeType = getMimeTypeFromDataUri(base64DataUri);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: rawBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt || "Describe this image in detail, identifying key objects, style, and mood.",
          },
        ],
      },
    });

    if (response.text) {
      return response.text;
    }
    
    throw new Error("No analysis text returned.");
  } catch (error: any) {
    console.error("Analyze Image Error:", error);
    throw new Error(error.message || "Failed to analyze image");
  }
};
