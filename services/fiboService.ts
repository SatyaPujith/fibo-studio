import { StudioConfig, StudioObject, ConsistencySettings } from "../types";

/**
 * BRIA FIBO Service - JSON-Native Image Generation
 * 
 * FIBO's key feature is JSON-native control - sending structured parameters
 * for camera, lighting, composition instead of just text prompts.
 */

const FIBO_API_BASE = "https://engine.prod.bria-api.com/v1";

interface FiboResponse {
  result: Array<{
    urls: string[];
    seed?: number;
  }>;
}

interface CameraData {
  horizontal: string;
  vertical: string;
  distance: number;
  horizontalDeg: number;
  verticalDeg: number;
  position: { x: number; y: number; z: number };
}

/**
 * FIBO JSON-Native Parameters
 * These are the structured controls that FIBO understands
 */
interface FiboJsonParams {
  // Core prompt
  prompt: string;
  
  // Generation settings
  num_results: number;
  sync: boolean;
  
  // FIBO JSON-Native Controls
  scene?: {
    subject: string;
    subject_description?: string;
    background?: string;
    environment?: string;
  };
  
  camera?: {
    angle?: string;  // "eye_level", "high_angle", "low_angle", "bird_eye", "worm_eye"
    shot_type?: string;  // "close_up", "medium_shot", "full_shot", "wide_shot"
    position?: string;  // "front", "side", "back", "three_quarter"
  };
  
  lighting?: {
    type?: string;  // "studio", "natural", "dramatic", "soft", "hard"
    direction?: string;  // "front", "side", "back", "top"
    intensity?: string;  // "low", "medium", "high"
    color_temperature?: string;  // "warm", "neutral", "cool"
  };
  
  color_palette?: {
    primary?: string;
    secondary?: string;
    background?: string;
    mood?: string;  // "vibrant", "muted", "monochrome", "pastel"
  };
  
  composition?: {
    framing?: string;  // "centered", "rule_of_thirds", "symmetrical"
    orientation?: string;  // "portrait", "landscape", "square"
  };
  
  style?: {
    type?: string;  // "photorealistic", "artistic", "minimal"
    quality?: string;  // "standard", "high", "ultra"
  };
}

const getFiboApiKey = (): string => {
  // Vite exposes env vars via import.meta.env with VITE_ prefix
  const apiKey = import.meta.env.VITE_FIBO_API_KEY || import.meta.env.VITE_BRIA_API_KEY || import.meta.env.FIBO_API_KEY;
  if (!apiKey || apiKey.includes("PLACEHOLDER")) {
    throw new Error("Please set VITE_FIBO_API_KEY in .env.local");
  }
  return apiKey;
};


/**
 * Convert hex color to color name for better prompt understanding
 */
const hexToColorName = (hex: string): string => {
  const colors: Record<string, string> = {
    '#ffffff': 'white', '#000000': 'black', '#f4f4f5': 'light gray',
    '#09090b': 'dark black', '#2a221e': 'dark brown', '#0f172a': 'dark blue',
    '#e4e4e7': 'light gray', '#27272a': 'dark gray', '#5c3a2e': 'brown',
    '#1e3a8a': 'navy blue', '#ffba75': 'warm orange', '#60a5fa': 'sky blue'
  };
  return colors[hex.toLowerCase()] || hex;
};

/**
 * Convert studio config to FIBO JSON parameters
 * Optimized for exact scene reproduction
 */
const buildFiboJsonParams = (
  config: StudioConfig,
  objects: StudioObject[],
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string
): FiboJsonParams => {
  // Parse camera data from Scene3D
  let cameraData: CameraData;
  try {
    cameraData = JSON.parse(cameraContext);
  } catch {
    cameraData = {
      horizontal: "front view",
      vertical: "eye-level",
      distance: 6,
      horizontalDeg: 0,
      verticalDeg: 90,
      position: { x: 0, y: 2, z: 6 }
    };
  }

  // Get object info
  const objectName = variationPrompt || objects.map(o => o.name).join(" and ");
  const mainObject = objects[0];
  
  // Determine object orientation from rotation
  let objectOrientation = "upright";
  let objectPose = "";
  if (mainObject) {
    const [rx, ry, rz] = mainObject.rotation;
    // Convert radians to degrees for better understanding
    const rxDeg = Math.round((rx * 180) / Math.PI);
    const ryDeg = Math.round((ry * 180) / Math.PI);
    const rzDeg = Math.round((rz * 180) / Math.PI);
    
    if (Math.abs(rxDeg) > 30 || Math.abs(rzDeg) > 30) {
      objectOrientation = "tilted";
      objectPose = `rotated ${rxDeg}° on X-axis, ${rzDeg}° on Z-axis`;
    }
    if (Math.abs(ryDeg) > 10) {
      objectPose += ` turned ${ryDeg}° horizontally`;
    }
  }

  // Convert camera angles to FIBO format with exact degrees
  const getCameraAngle = (): string => {
    const v = cameraData.verticalDeg;
    if (v < 30) return "bird_eye";
    if (v < 60) return "high_angle";
    if (v > 120) return "worm_eye";
    if (v > 100) return "low_angle";
    return "eye_level";
  };

  const getCameraPosition = (): string => {
    // Use the actual angle (not absolute) to determine left vs right
    const h = cameraData.horizontalDeg;
    const absH = Math.abs(h);
    
    if (absH < 30) return "front";
    if (absH > 150) return "back";
    if (absH >= 60 && absH <= 120) {
      // Determine left or right side based on sign
      return h > 0 ? "side_left" : "side_right";
    }
    // Three-quarter views
    if (h > 0) return "three_quarter_left";
    return "three_quarter_right";
  };

  const getShotType = (): string => {
    const d = cameraData.distance;
    if (d < 3) return "close_up";
    if (d < 5) return "medium_shot";
    if (d < 8) return "full_shot";
    return "wide_shot";
  };

  // Convert lighting to FIBO format
  const getLightingType = (): string => {
    const intensity = config.lighting.keyLightIntensity;
    if (intensity > 1.5) return "dramatic";
    if (intensity < 0.5) return "soft";
    return "studio";
  };

  const getLightingDirection = (): string => {
    const [x, y, z] = config.lighting.keyLightPosition;
    if (y > 4) return "top";
    if (Math.abs(x) > Math.abs(z)) return "side";
    if (z < 0) return "back";
    return "front";
  };

  // Get color names for better prompt understanding
  const bgColorName = hexToColorName(config.environment.backgroundColor);
  const floorColorName = hexToColorName(config.environment.floorColor);
  const objectColorName = mainObject ? hexToColorName(mainObject.color) : "neutral";

  // Get camera descriptions
  const cameraAngle = getCameraAngle();
  const cameraPosition = getCameraPosition();
  const shotType = getShotType();
  
  // Precise angle descriptions with degrees
  const angleDescMap: Record<string, string> = {
    "bird_eye": `top-down view (${Math.round(cameraData.verticalDeg)}° from above)`,
    "high_angle": `high angle looking down (${Math.round(cameraData.verticalDeg)}° elevation)`,
    "eye_level": `straight-on eye level view`,
    "low_angle": `low angle looking up (${Math.round(cameraData.verticalDeg)}° from ground)`,
    "worm_eye": `extreme low angle from below`
  };

  const positionDescMap: Record<string, string> = {
    "front": "directly from the front",
    "back": "from behind",
    "side_left": `from the left side (${Math.round(Math.abs(cameraData.horizontalDeg))}° angle)`,
    "side_right": `from the right side (${Math.round(Math.abs(cameraData.horizontalDeg))}° angle)`,
    "three_quarter_left": `three-quarter view from left (${Math.round(Math.abs(cameraData.horizontalDeg))}° from front)`,
    "three_quarter_right": `three-quarter view from right (${Math.round(Math.abs(cameraData.horizontalDeg))}° from front)`
  };

  const shotDescMap: Record<string, string> = {
    "close_up": "close-up shot filling the frame",
    "medium_shot": "medium shot with some space around",
    "full_shot": "full shot showing complete object",
    "wide_shot": "wide shot with environment visible"
  };

  // Build the most precise prompt possible
  const promptParts = [
    // Subject - EXACT specification
    `Single ${objectName}`,
    objectColorName !== "neutral" ? `${objectColorName} colored` : "",
    objectOrientation !== "upright" ? objectPose : "standing upright",
    
    // Camera - EXACT specification
    angleDescMap[cameraAngle],
    positionDescMap[cameraPosition],
    shotDescMap[shotType],
    
    // Background - EXACT specification
    `solid ${bgColorName} background`,
    `${floorColorName} floor surface`,
    
    // Style
    style === 'professional' 
      ? 'professional product photography, photorealistic rendering, 8K resolution, studio lighting, commercial quality'
      : 'clean product photograph, simple lighting',
    
    // Negative guidance embedded
    'single isolated object only',
    'no other objects in scene',
    'no props',
    'no decorations',
    'centered composition'
  ].filter(Boolean).join(', ');

  // Build the JSON parameters - FIBO native format
  const params: FiboJsonParams = {
    prompt: promptParts,
    num_results: 1,
    sync: true,

    // Scene control
    scene: {
      subject: objectName,
      subject_description: `${objectColorName} ${objectName}, ${objectOrientation}, isolated on ${bgColorName} background`,
      background: bgColorName,
      environment: "studio"
    },

    // Camera control - using exact values
    // Map detailed positions back to FIBO-compatible values
    camera: {
      angle: cameraAngle,
      shot_type: shotType,
      position: cameraPosition.includes("side") ? "side" : 
                cameraPosition.includes("three_quarter") ? "three_quarter" : cameraPosition
    },

    // Lighting control
    lighting: {
      type: getLightingType(),
      direction: getLightingDirection(),
      intensity: config.lighting.keyLightIntensity > 1 ? "high" : "medium",
      color_temperature: "neutral"
    },

    // Color palette
    color_palette: {
      primary: mainObject?.color || "#ffffff",
      background: config.environment.backgroundColor,
      secondary: config.environment.floorColor,
      mood: style === 'professional' ? "vibrant" : "neutral"
    },

    // Composition
    composition: {
      framing: "centered",
      orientation: "square"
    },

    // Style
    style: {
      type: "photorealistic",
      quality: style === 'professional' ? "ultra" : "high"
    }
  };

  return params;
};


/**
 * Main generation function - sends JSON to FIBO via backend proxy
 */
export const generateFiboImageFromReference = async (
  config: StudioConfig,
  allObjects: StudioObject[],
  _snapshotBase64: string,
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string,
  _consistencySettings?: ConsistencySettings
): Promise<string> => {
  // Build FIBO JSON parameters
  const fiboParams = buildFiboJsonParams(config, allObjects, style, cameraContext, variationPrompt);

  console.log("=== FIBO JSON-Native Generation ===");
  console.log("Objects:", allObjects.map(o => o.name));
  console.log("Camera data:", cameraContext);
  console.log("FIBO JSON Params:", JSON.stringify(fiboParams, null, 2));

  try {
    // Get auth token from localStorage (optional for guest mode)
    const token = localStorage.getItem('token');
    
    // Send JSON to backend proxy
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add authorization header only if token exists (for authenticated users)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/images/generate-fibo`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fiboParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend Error:", response.status, errorText);
      
      // If JSON params not supported, try with just prompt
      console.log("Trying with simplified prompt...");
      const fallbackResponse = await fetch(`${apiUrl}/images/generate-fibo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: fiboParams.prompt,
          num_results: 1,
          sync: true
        })
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Backend API error: ${response.status}`);
      }

      const fallbackData: FiboResponse = await fallbackResponse.json();
      if (fallbackData.result?.[0]?.urls?.[0]) {
        return fallbackData.result[0].urls[0];
      }
    }

    const data: FiboResponse = await response.json();
    console.log("FIBO Response:", data);
    
    if (data.result?.[0]?.urls?.[0]) {
      return data.result[0].urls[0];
    }
    
    throw new Error("No image URL in response");
  } catch (error) {
    console.error("FIBO Error:", error);
    throw error;
  }
};

export const generateFiboImage = generateFiboImageFromReference;

// Export for debugging
export const getFiboJsonConfig = (
  config: StudioConfig,
  allObjects: StudioObject[],
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string
) => buildFiboJsonParams(config, allObjects, style, cameraContext, variationPrompt);
