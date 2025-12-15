import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudioConfig, StudioObject, ConsistencySettings } from "../types";

// Helper to get safe API client
const getClient = () => {
  // Vite exposes env vars via import.meta.env with VITE_ prefix
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY not found in environment. Please add it to .env.local");
  }
  return new GoogleGenAI({ apiKey });
};

export interface StudioUpdateResult {
  config: StudioConfig;
  objectAction?: {
    type: 'UPDATE' | 'CREATE';
    properties: Partial<StudioObject>;
  };
}

// 1. Prompt Interpreter & 3D Modeler
export const translatePromptToStudioConfig = async (
  currentConfig: StudioConfig,
  currentObject: StudioObject,
  userPrompt: string
): Promise<StudioUpdateResult> => {
  const ai = getClient();
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      lighting: {
        type: Type.OBJECT,
        properties: {
          ambientIntensity: { type: Type.NUMBER },
          ambientColor: { type: Type.STRING },
          keyLightIntensity: { type: Type.NUMBER },
          keyLightColor: { type: Type.STRING },
          keyLightPosition: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          fillLightIntensity: { type: Type.NUMBER },
          fillLightColor: { type: Type.STRING },
          fillLightPosition: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          rimLightIntensity: { type: Type.NUMBER },
          rimLightColor: { type: Type.STRING },
          rimLightPosition: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        },
        // Added fillLightPosition and rimLightPosition to required
        required: ["ambientIntensity", "keyLightIntensity", "keyLightPosition", "fillLightIntensity", "fillLightPosition", "rimLightIntensity", "rimLightPosition"]
      },
      environment: {
        type: Type.OBJECT,
        properties: {
          backgroundColor: { type: Type.STRING },
          floorRoughness: { type: Type.NUMBER },
          floorColor: { type: Type.STRING },
          platformType: { type: Type.STRING, enum: ['none', 'cylinder', 'cube', 'round_table'] },
          platformColor: { type: Type.STRING },
          platformMaterial: { type: Type.STRING, enum: ['matte', 'glossy', 'wood', 'marble', 'metal'] },
        },
        required: ["backgroundColor", "floorRoughness", "floorColor", "platformType", "platformColor", "platformMaterial"]
      },
      moodDescription: { type: Type.STRING },
      objectChange: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, enum: ["UPDATE", "CREATE", "NONE"] },
          name: { type: Type.STRING },
          // Compound Object Structure
          parts: {
            type: Type.ARRAY,
            description: "List of 3D primitives to build the object. E.g. for a Chair: 4 cylinder legs, 1 cube seat, 1 cube back.",
            items: {
              type: Type.OBJECT,
              properties: {
                shape: { type: Type.STRING, enum: ["cube", "sphere", "cylinder", "cone", "torus"] },
                position: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Relative position [x,y,z]" },
                rotation: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Rotation in radians [x,y,z]" },
                scale: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "Scale [x,y,z]" },
                color: { type: Type.STRING, description: "Hex color" },
                roughness: { type: Type.NUMBER },
                metalness: { type: Type.NUMBER }
              },
              required: ["shape", "position", "rotation", "scale", "color"]
            }
          },
          // Global object transform
          position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        }
      }
    },
    required: ["lighting", "environment", "moodDescription"]
  };

  const systemInstruction = `
    You are an expert 3D Technical Artist and Studio Director.
    
    TASK 1: Studio Lighting & Environment
    - Translate the user's mood into precise lighting/environment settings.
    - "Cinematic" = High contrast, strong rim light.
    - "Soft" = High ambient, low contrast.
    
    TASK 2: 3D Object Construction (Constructive Solid Geometry)
    - Build DETAILED realistic 3D silhouettes using 5-20 primitives.
    
    **CRITICAL ORIENTATION RULE**:
    - The FRONT of the object MUST face the POSITIVE Z direction (towards the camera at [0,0,5])
    - For vehicles (cars, trucks, buses): The front grille/headlights face +Z
    - For furniture (beds, sofas): The front/seating area faces +Z
    - For electronics (TV, monitor): The screen faces +Z
    - The object's LENGTH should be along the X-axis, HEIGHT along Y-axis
    - This ensures when camera is at "Front" position, user sees the object's FRONT
    
    **KITBASHING RULES**:
      - Use **Cylinders** for lenses, buttons, wires, handles, wheels.
      - Use **Toruses** for rings, rims, tires, cushions.
      - Use **Spheres** for bulbs, joints, rounded caps, headlights.
      - Use **Cubes** (scaled thin) for panels, screens, bases, body panels.
    
    - **REALISM GOAL**: The object blockout must look convincing in the viewport.
      - A car needs: Body, Hood, Roof, Windows, Wheels (4), Headlights, Grille. (10+ parts)
      - A truck needs: Cab, Trailer, Wheels (6+), Headlights, Grille. (12+ parts)
    
    EXAMPLES:
    - "Car" (FRONT faces +Z):
      1. Cube (Body), Scale [2, 0.5, 1], Position [0, 0.5, 0] - length along X
      2. Cube (Hood), Scale [0.8, 0.2, 0.5], Position [0, 0.6, 0.5] - front at +Z
      3. Cylinder (Wheel FL), Scale [0.3, 0.1, 0.3], Rotation [0, 0, 1.57], Position [-0.7, 0.2, 0.3]
      4. Sphere (Headlight L), Scale [0.1, 0.1, 0.1], Position [-0.3, 0.5, 0.5] - at front (+Z)
      
    RULES:
    - Use 'compound' type implicitly by providing 'parts'.
    - Colors should be realistic hex codes.
    - ALWAYS orient objects so their FRONT faces +Z direction.
    - If the user just moves/rotates the existing object, set action="UPDATE".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      
      const result: StudioUpdateResult = {
        config: {
          // Merge with current config to prevent missing fields (e.g. fillLightPosition) from crashing the app
          lighting: { ...currentConfig.lighting, ...(parsed.lighting || {}) },
          environment: { ...currentConfig.environment, ...(parsed.environment || {}) },
          moodDescription: parsed.moodDescription || currentConfig.moodDescription
        }
      };

      if (parsed.objectChange && parsed.objectChange.action !== 'NONE') {
        const isCreate = parsed.objectChange.action === 'CREATE';
        const hasParts = parsed.objectChange.parts && parsed.objectChange.parts.length > 0;
        
        result.objectAction = {
          type: parsed.objectChange.action,
          properties: {
            name: parsed.objectChange.name || (isCreate ? 'New Object' : currentObject.name),
            type: hasParts ? 'compound' : 'primitive',
            position: parsed.objectChange.position || currentObject.position,
            rotation: parsed.objectChange.rotation || currentObject.rotation,
            scale: parsed.objectChange.scale || currentObject.scale,
          }
        };

        // If AI generated new geometry structure
        if (hasParts) {
           result.objectAction.properties.parts = parsed.objectChange.parts;
           result.objectAction.properties.shape = undefined; 
        }
      }

      return result;
    }
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Error interpreting prompt:", error);
    return { config: currentConfig }; 
  }
};

// 2. Internal image generation helper
const generateImageInternal = async (
  config: StudioConfig,
  allObjects: StudioObject[],
  snapshotBase64: string,
  style: 'plain' | 'professional',
  variationPrompt?: string
): Promise<string> => {
  const ai = getClient();
  const base64Data = snapshotBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  const objectNames = variationPrompt || allObjects.map(o => o.name).join(", ");
  const bgColor = config.environment.backgroundColor;
  const floorColor = config.environment.floorColor;

  const prompt = `You are a photorealistic texture artist. Your ONLY job is to add realistic materials and textures to this 3D render.

ABSOLUTE RULES - DO NOT BREAK THESE:
1. DO NOT change the camera angle - keep EXACTLY the same viewpoint
2. DO NOT move or reposition any object - keep EXACTLY the same position
3. DO NOT add ANY new objects - only the ${objectNames} should be visible
4. DO NOT change the background - keep the ${bgColor} background and ${floorColor} floor
5. DO NOT change the composition or framing

YOUR ONLY TASK:
- Take the ${objectNames} shown in this 3D render
- Apply photorealistic materials, textures, and surface details to it
- Make it look like a real ${objectNames} photographed in a studio
- Keep everything else IDENTICAL

The object is: ${objectNames}
Style: ${style === 'professional' ? 'Professional product photography, 8K resolution, studio lighting, commercial quality' : 'Clean product photo'}

Think of this as "upgrading the materials" on a 3D model - the shape, position, angle, and background stay EXACTLY the same, only the surface becomes photorealistic.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: base64Data } },
        { text: prompt }
      ]
    },
    config: {
      responseModalities: ["image", "text"]
    }
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    const parts = candidates[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  }
  throw new Error("No image data received");
};

// 3. Main export - Uses FIBO with internal enhancement
import { generateFiboImageFromReference } from './fiboService';

export const generateStudioImage = async (
  config: StudioConfig,
  allObjects: StudioObject[],
  snapshotBase64: string,
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string,
  consistencySettings?: ConsistencySettings
): Promise<string> => {
  // Try Gemini first (image-to-image - preserves camera angle!)
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.API_KEY;
    if (apiKey && snapshotBase64 && snapshotBase64.length > 100) {
      console.log("🎯 Trying Gemini image-to-image (preserves camera angle)...");
      const result = await generateImageInternal(config, allObjects, snapshotBase64, style, variationPrompt);
      console.log("✅ Gemini succeeded! Camera angle preserved.");
      return result;
    }
  } catch (error: any) {
    // Log the error so user knows why it failed
    console.warn("⚠️ Gemini failed:", error?.message || error);
    if (error?.message?.includes("quota") || error?.message?.includes("429")) {
      console.warn("💡 Gemini quota exceeded. Falling back to FIBO (text-to-image).");
      console.warn("⚠️ Note: FIBO text-to-image may not match exact camera angle.");
    }
  }
  
  // Use FIBO as fallback (text-to-image - camera angle is approximate)
  console.log("📷 Using FIBO text-to-image (camera angle from prompt description)...");
  return generateFiboImageFromReference(
    config,
    allObjects,
    snapshotBase64,
    style,
    cameraContext,
    variationPrompt,
    consistencySettings
  );
};

export const generateObjectTexture = async () => "";
export const generateObjectDepthMap = async () => "";
export const generateSurfaceTexture = async () => "";