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
 * Optimized for exact scene reproduction with precise spatial understanding
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

  // Determine camera view type based on angles
  const getCameraViewType = (): string => {
    const h = Math.abs(cameraData.horizontalDeg);
    const v = cameraData.verticalDeg;
    
    // Vertical view classification
    if (v < 30) return "TOP_DOWN";
    if (v < 60) return "HIGH_ANGLE";
    if (v > 120) return "WORM_EYE";
    if (v > 100) return "LOW_ANGLE";
    return "EYE_LEVEL";
  };

  // Determine horizontal view direction
  const getHorizontalView = (): string => {
    const h = cameraData.horizontalDeg;
    const absH = Math.abs(h);
    
    if (absH < 15) return "FRONT";
    if (absH > 165) return "BACK";
    if (absH >= 75 && absH <= 105) {
      return h > 0 ? "LEFT_SIDE" : "RIGHT_SIDE";
    }
    if (h > 0) return "FRONT_LEFT_ANGLE";
    return "FRONT_RIGHT_ANGLE";
  };

  const viewType = getCameraViewType();
  const horizontalView = getHorizontalView();
  const distance = cameraData.distance;

  // Build detailed spatial description
  const getSpatialDescription = (): string => {
    const parts: string[] = [];
    
    // Camera position relative to object
    const camPos = cameraData.position;
    
    if (viewType === "TOP_DOWN") {
      parts.push("Camera positioned directly above the object, looking straight down");
      parts.push("Object is centered below the camera");
      parts.push("Show the top surface of the object clearly");
    } else if (viewType === "HIGH_ANGLE") {
      parts.push(`Camera positioned above and in front of the object at ${cameraData.verticalDeg}° angle`);
      parts.push("Object is below and in front of the camera");
      parts.push("Show top and front surfaces of the object");
    } else if (viewType === "EYE_LEVEL") {
      parts.push("Camera positioned at eye level with the object");
      parts.push("Object is directly in front of the camera");
      parts.push("Show the front-facing surface of the object");
    } else if (viewType === "LOW_ANGLE") {
      parts.push(`Camera positioned below the object at ${180 - cameraData.verticalDeg}° angle`);
      parts.push("Object is above and in front of the camera");
      parts.push("Show bottom and front surfaces of the object");
    }

    // Horizontal positioning
    if (horizontalView === "FRONT") {
      parts.push("Camera is directly in front of the object");
      parts.push("Object faces the camera");
    } else if (horizontalView === "LEFT_SIDE") {
      parts.push("Camera is positioned to the LEFT side of the object");
      parts.push("Object's left side faces the camera");
      parts.push("Show the left profile of the object");
    } else if (horizontalView === "RIGHT_SIDE") {
      parts.push("Camera is positioned to the RIGHT side of the object");
      parts.push("Object's right side faces the camera");
      parts.push("Show the right profile of the object");
    } else if (horizontalView === "BACK") {
      parts.push("Camera is positioned behind the object");
      parts.push("Object's back faces the camera");
      parts.push("Show the back of the object");
    } else if (horizontalView === "FRONT_LEFT_ANGLE") {
      parts.push(`Camera is at a front-left angle (${cameraData.horizontalDeg}° from front)`);
      parts.push("Show both front and left surfaces of the object");
    } else if (horizontalView === "FRONT_RIGHT_ANGLE") {
      parts.push(`Camera is at a front-right angle (${Math.abs(cameraData.horizontalDeg)}° from front)`);
      parts.push("Show both front and right surfaces of the object");
    }

    // Distance/framing
    if (distance < 3) {
      parts.push("Close-up shot - object fills most of the frame");
    } else if (distance < 5) {
      parts.push("Medium shot - object with some space around it");
    } else if (distance < 8) {
      parts.push("Full shot - complete object visible with environment");
    } else {
      parts.push("Wide shot - object with significant space and environment visible");
    }

    return parts.join(". ");
  };

  // Get color names for better prompt understanding
  const bgColorName = hexToColorName(config.environment.backgroundColor);
  const floorColorName = hexToColorName(config.environment.floorColor);
  const objectColorName = mainObject ? hexToColorName(mainObject.color) : "neutral";

  // Build the most precise prompt possible
  const promptParts = [
    // CRITICAL: Object name MUST be first and clear
    `Generate a ${objectName}`,
    
    // CRITICAL: Spatial positioning - MUST be enforced
    `[SPATIAL CONSTRAINT] ${getSpatialDescription()}`,
    
    // CRITICAL: View type enforcement
    `[VIEW TYPE] ${viewType} view from ${horizontalView} angle`,
    
    // Subject details
    objectColorName !== "neutral" ? `${objectColorName} colored` : "",
    objectOrientation !== "upright" ? objectPose : "standing upright",
    
    // Background - EXACT specification for studio
    bgColorName === 'white' || bgColorName === 'light gray'
      ? 'pure white studio background, clean white cyclorama, no shadows on background'
      : `solid ${bgColorName} background`,
    floorColorName === 'white' || floorColorName === 'light gray'
      ? 'white studio floor, seamless white surface'
      : `${floorColorName} floor surface`,
    
    // Studio lighting - CRITICAL for consistency
    style === 'professional' 
      ? 'professional studio product photography, three-point lighting setup, key light from front-left, fill light from front-right, back light for separation, photorealistic rendering, 8K resolution, commercial quality, perfectly lit, studio environment, white cyclorama background, clean shadows, professional lighting'
      : 'clean studio product photograph, soft studio lighting, white background, simple professional lighting, well-lit, studio environment',
    
    // CRITICAL: Negative constraints - DO NOT CHANGE VIEW
    'DO NOT change camera angle',
    'DO NOT rotate object from specified view',
    'DO NOT change perspective or viewpoint',
    'DO NOT reposition object',
    'DO NOT use different camera position',
    'single isolated object only',
    'no other objects in scene',
    'no props',
    'no decorations',
    'no people',
    'no text',
    'centered composition',
    'clean background',
    'no shadows on background',
    'professional quality'
  ].filter(Boolean).join(', ');

  // Build the JSON parameters - FIBO native format
  const params: FiboJsonParams = {
    prompt: promptParts,
    num_results: 1,
    sync: true,

    // Scene control
    scene: {
      subject: objectName,
      subject_description: `${objectColorName} ${objectName}, ${objectOrientation}, isolated on ${bgColorName} background, viewed from ${horizontalView} at ${viewType}`,
      background: bgColorName,
      environment: "studio"
    },

    // Camera control - using exact values
    camera: {
      angle: viewType,
      shot_type: distance < 3 ? "close_up" : distance < 5 ? "medium_shot" : distance < 8 ? "full_shot" : "wide_shot",
      position: horizontalView
    },

    // Lighting control
    lighting: {
      type: config.lighting.keyLightIntensity > 1.5 ? "dramatic" : config.lighting.keyLightIntensity < 0.5 ? "soft" : "studio",
      direction: "front",
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
