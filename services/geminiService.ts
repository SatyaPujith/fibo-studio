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
    - **KITBASHING RULES**:
      - Use **Cylinders** for lenses, buttons, wires, handles.
      - Use **Toruses** for rings, rims, tires, cushions.
      - Use **Spheres** for bulbs, joints, rounded caps.
      - Use **Cubes** (scaled thin) for panels, screens, bases.
    
    - **REALISM GOAL**: The object blockout must look convincing in the viewport. Don't be lazy with 2 cubes. 
      - A camera needs: Body, Lens Barrel, Lens Glass, Flash, Shutter Button, Grip, Viewfinder. (7+ parts)
      - A sneaker needs: Sole, Heel, Main body, Tongue, Laces (abstracted).
    
    EXAMPLES:
    - "Vintage Camera":
      1. Cube (Body), Black Leather, Scale [1.5, 1.0, 0.5]
      2. Cylinder (Lens Base), Silver, Rotated [90,0,0], Position [0,0,0.3], Scale [0.7,0.2,0.7]
      3. Cylinder (Lens Glass), Black, Rotated [90,0,0], Position [0,0,0.4], Scale [0.5,0.05,0.5]
      4. Cube (Flash), Silver, Position [0.5,0.6,0], Scale [0.3,0.3,0.3]
      5. Cylinder (Button), Red, Position [-0.5,0.6,0], Scale [0.1,0.1,0.1]
      6. Cube (Viewfinder), Black, Position [0,0.6,0], Scale [0.2,0.2,0.2]
      
    RULES:
    - Use 'compound' type implicitly by providing 'parts'.
    - Colors should be realistic hex codes.
    - If user asks for "realistic", add small details (buttons, knobs, feet).
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

// 2. Main export - FIBO only for image generation
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
  console.log("Using FIBO for image generation...");
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