
import { GoogleGenAI, Modality } from "@google/genai";
import { stripBase64Prefix, getMimeTypeFromDataUri } from "../utils/imageUtils";

// Initialize Gemini Client
// NOTE: In a production app, ensure strict env var checking.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates an image from a text prompt using Imagen 3/4 or Gemini Flash Image based on resolution.
 */
export const generateImage = async (prompt: string, aspectRatio: string = '1:1', resolution: 'low' | 'medium' | 'high' = 'high'): Promise<string> => {
  try {
    // High resolution uses the dedicated Imagen model for best quality
    if (resolution === 'high') {
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
      if (!generatedImage?.image?.imageBytes) {
        throw new Error("No image generated.");
      }

      return `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
    } else {
      // Low/Medium resolution uses Gemini Flash Image (General Purpose)
      // This model generates images via generateContent with responseModalities
      
      // Append aspect ratio to prompt as a hint since config support varies for this model
      const enhancedPrompt = `${prompt}. Aspect ratio ${aspectRatio}.`;

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
    }
  } catch (error) {
    console.error("Generate Image Error:", error);
    throw error;
  }
};

/**
 * Edits an existing image based on a text prompt using Gemini 2.5 Flash Image.
 * This model supports multimodal input (image + text) and can output a modified image.
 */
export const editImage = async (base64DataUri: string, prompt: string): Promise<string> => {
  try {
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
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

/**
 * Removes the background from an image using Gemini 2.5 Flash Image.
 */
export const removeBackground = async (base64DataUri: string): Promise<string> => {
  try {
    // We reuse the edit functionality but with a very specific prompt instructions.
    return await editImage(
      base64DataUri, 
      "Remove the background from this image. Isolate the main subject completely on a clean, transparent or white background."
    );
  } catch (error) {
    console.error("Remove Background Error:", error);
    throw error;
  }
};

/**
 * Upscales and enhances an image using Gemini 2.5 Flash Image.
 */
export const upscaleImage = async (base64DataUri: string): Promise<string> => {
  try {
    return await editImage(
      base64DataUri,
      "Upscale this image to high resolution. Enhance details, sharpness, and clarity significantly while maintaining the original content and composition. The output should be crisp and highly detailed."
    );
  } catch (error) {
    console.error("Upscale Image Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image and provides a text description using Gemini 2.5 Flash.
 */
export const analyzeImage = async (base64DataUri: string, prompt: string): Promise<string> => {
  try {
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
  } catch (error) {
    console.error("Analyze Image Error:", error);
    throw error;
  }
};
