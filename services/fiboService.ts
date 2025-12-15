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

// Old CameraData interface removed - now using NewCameraContext with preset-based detection

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
 * New camera context interface (simplified, preset-based)
 */
interface NewCameraContext {
  viewName: string;
  viewDescription: string;
  verticalDesc: string;
  shotType: string;
  distance: number;
  position: { x: number; y: number; z: number };
  confidence: number;
}

/**
 * Convert studio config to FIBO JSON parameters
 * Uses preset-based view detection for accurate camera descriptions
 */
const buildFiboJsonParams = (
  config: StudioConfig,
  objects: StudioObject[],
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string
): FiboJsonParams => {
  // Parse the new camera context format
  let camCtx: NewCameraContext;
  try {
    camCtx = JSON.parse(cameraContext);
  } catch {
    camCtx = {
      viewName: 'front',
      viewDescription: 'front view, facing camera directly',
      verticalDesc: 'eye level',
      shotType: 'medium shot',
      distance: 5,
      position: { x: 0, y: 2, z: 5 },
      confidence: 1
    };
  }

  // Get object info
  const objectName = variationPrompt || objects.map(o => o.name).join(" and ");
  const mainObject = objects[0];
  
  // Get color names
  const bgColorName = hexToColorName(config.environment.backgroundColor);
  const floorColorName = hexToColorName(config.environment.floorColor);
  const objectColorName = mainObject ? hexToColorName(mainObject.color) : "neutral";

  // Objects are now created with FRONT facing +Z (towards camera)
  // So camera view directly maps to what FIBO should generate
  // No adjustment needed - camera "front" = object "front"
  
  console.log(`🎯 Object: "${objectName}"`);
  console.log(`📷 Camera view: ${camCtx.viewName} → FIBO view: ${camCtx.viewName}`);

  // Map view names to FIBO camera positions
  const viewToFiboPosition: Record<string, string> = {
    'front': 'front',
    'back': 'back',
    'right': 'side',
    'left': 'side',
    'top': 'front', // FIBO doesn't have top, use front with high angle
    'bottom': 'front', // FIBO doesn't have bottom, use front with low angle
    '3/4_front_right': 'three_quarter',
    '3/4_back_left': 'three_quarter',
    'hero': 'three_quarter'
  };

  // Map view names to FIBO camera angles
  const viewToFiboAngle: Record<string, string> = {
    'front': 'eye_level',
    'back': 'eye_level',
    'right': 'eye_level',
    'left': 'eye_level',
    'top': 'bird_eye',
    'bottom': 'worm_eye',
    '3/4_front_right': 'eye_level',
    '3/4_back_left': 'eye_level',
    'hero': 'high_angle'
  };

  // Camera view directly maps to FIBO view (objects are created facing +Z)
  const fiboPosition = viewToFiboPosition[camCtx.viewName] || 'front';
  const fiboAngle = viewToFiboAngle[camCtx.viewName] || 'eye_level';
  
  // Determine shot type
  let fiboShotType = 'medium_shot';
  if (camCtx.distance < 3) fiboShotType = 'close_up';
  else if (camCtx.distance < 5) fiboShotType = 'medium_shot';
  else if (camCtx.distance < 8) fiboShotType = 'full_shot';
  else fiboShotType = 'wide_shot';

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

  // Create VERY explicit view descriptions that FIBO will follow
  const getExplicitViewPrompt = (viewName: string): string => {
    const viewPrompts: Record<string, string> = {
      'front': 'STRICTLY FRONT VIEW ONLY. Camera directly in front of the object. Show the front face, front grille, front headlights. NO angle, NO side visible, PURE front view like a passport photo.',
      'back': 'STRICTLY REAR VIEW ONLY. Camera directly behind the object. Show the back, rear lights, back panel. NO angle, NO side visible, PURE back view.',
      'right': 'STRICTLY RIGHT SIDE PROFILE. Camera at exact 90 degrees to the right. Show only the right side. NO front visible, NO angle, PURE side profile view.',
      'left': 'STRICTLY LEFT SIDE PROFILE. Camera at exact 90 degrees to the left. Show only the left side. NO front visible, NO angle, PURE side profile view.',
      'top': 'STRICTLY TOP DOWN VIEW. Camera directly above looking down. Bird eye view showing the top surface only.',
      'bottom': 'STRICTLY BOTTOM UP VIEW. Camera below looking up at the underside.',
      '3/4_front_right': 'THREE-QUARTER FRONT RIGHT VIEW. Show front and right side at 45 degree angle. Classic car photography angle.',
      '3/4_back_left': 'THREE-QUARTER REAR LEFT VIEW. Show back and left side at 45 degree angle.',
      'hero': 'HERO SHOT. Elevated three-quarter view, slightly above eye level, showing front and one side dramatically.'
    };
    return viewPrompts[viewName] || viewPrompts['front'];
  };

  // Build the prompt with EXTREME emphasis on camera angle
  // Camera view = what user sees = what FIBO should generate
  const explicitView = getExplicitViewPrompt(camCtx.viewName);
  
  const promptParts = [
    // CAMERA ANGLE - repeat multiple times for emphasis
    explicitView,
    
    // Subject
    `Product: ${objectName}`,
    objectColorName !== "neutral" ? `Color: ${objectColorName}` : "",
    
    // Background
    `Background: solid ${bgColorName}`,
    `Floor: ${floorColorName}`,
    
    // Style
    style === 'professional' 
      ? 'Style: professional product photography, photorealistic, 8K, studio lighting'
      : 'Style: clean product photo',
    
    // Constraints
    'Single object only, centered, no props'
  ].filter(Boolean).join('. ');

  // Build the JSON parameters - FIBO native format
  const params: FiboJsonParams = {
    prompt: promptParts,
    num_results: 1,
    sync: true,

    // Scene control
    scene: {
      subject: objectName,
      subject_description: `${objectColorName} ${objectName}, isolated on ${bgColorName} background`,
      background: bgColorName,
      environment: "studio"
    },

    // Camera control - using detected view name
    camera: {
      angle: fiboAngle,
      shot_type: fiboShotType,
      position: fiboPosition
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
 * Upload image to a temporary hosting service to get a URL
 * BRIA API requires image URLs, not base64
 */
const uploadToTempHost = async (base64Data: string): Promise<string | null> => {
  try {
    // Try imgbb free hosting
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await fetch('https://api.imgbb.com/1/upload?key=d36eb6591370ae7f9089d85875e56b22', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data?.url) {
        console.log("✅ Image uploaded to temp host:", data.data.url);
        return data.data.url;
      }
    }
  } catch (error) {
    console.log("Temp host upload failed:", error);
  }
  return null;
};

/**
 * Try BRIA's image-to-image endpoints
 * These endpoints can transform the preview while keeping composition
 */
const tryImageToImage = async (
  apiKey: string,
  snapshotBase64: string,
  prompt: string,
  _bgColor: string
): Promise<string | null> => {
  const base64Data = snapshotBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  // First, try to upload image to get a URL (BRIA prefers URLs)
  const imageUrl = await uploadToTempHost(base64Data);
  
  if (imageUrl) {
    // Try BRIA's image-to-image with URL
    try {
      console.log("🎨 Trying BRIA image-to-image with hosted URL...");
      const response = await fetch(`${FIBO_API_BASE}/image-to-image/reimagine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': apiKey
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: `Transform this 3D render into a photorealistic product photo. Keep the EXACT same camera angle, position, and composition. ${prompt}`,
          num_results: 1,
          sync: true
        })
      });

      if (response.ok) {
        const data: FiboResponse = await response.json();
        if (data.result?.[0]?.urls?.[0]) {
          console.log("✅ BRIA image-to-image succeeded!");
          return data.result[0].urls[0];
        }
      } else {
        const errorText = await response.text();
        console.log("BRIA image-to-image failed:", response.status, errorText);
      }
    } catch (error) {
      console.log("BRIA image-to-image error:", error);
    }

    // Try product shot endpoint
    try {
      console.log("🎨 Trying BRIA product shot...");
      const response = await fetch(`${FIBO_API_BASE}/product/lifestyle_shot_by_image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': apiKey
        },
        body: JSON.stringify({
          image_url: imageUrl,
          scene_description: prompt,
          num_results: 1,
          sync: true,
          original_quality: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.[0]?.urls?.[0]) {
          console.log("✅ BRIA product shot succeeded!");
          return data.result[0].urls[0];
        }
      } else {
        const errorText = await response.text();
        console.log("BRIA product shot failed:", response.status, errorText);
      }
    } catch (error) {
      console.log("BRIA product shot error:", error);
    }
  }

  // Fallback: Try with base64 data URL directly
  try {
    console.log("🎨 Trying BRIA with base64 data URL...");
    const response = await fetch(`${FIBO_API_BASE}/image-to-image/reimagine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_token': apiKey
      },
      body: JSON.stringify({
        image_url: `data:image/png;base64,${base64Data}`,
        prompt: prompt,
        num_results: 1,
        sync: true
      })
    });

    if (response.ok) {
      const data: FiboResponse = await response.json();
      if (data.result?.[0]?.urls?.[0]) {
        console.log("✅ BRIA base64 URL succeeded!");
        return data.result[0].urls[0];
      }
    } else {
      const errorText = await response.text();
      console.log("Base64 URL failed:", response.status, errorText);
    }
  } catch (error) {
    console.log("Base64 URL error:", error);
  }

  console.log("All image-to-image endpoints failed, falling back to text-to-image");
  return null;
};

/**
 * Main generation function - tries image-to-image first, then text-to-image
 */
export const generateFiboImageFromReference = async (
  config: StudioConfig,
  allObjects: StudioObject[],
  snapshotBase64: string,
  style: 'plain' | 'professional',
  cameraContext: string,
  variationPrompt?: string,
  _consistencySettings?: ConsistencySettings
): Promise<string> => {
  const apiKey = getFiboApiKey();
  
  // Build FIBO JSON parameters
  const fiboParams = buildFiboJsonParams(config, allObjects, style, cameraContext, variationPrompt);

  // Parse camera context for logging
  let detectedView = 'unknown';
  try {
    const ctx = JSON.parse(cameraContext);
    detectedView = ctx.viewName || 'unknown';
  } catch {}

  console.log("=== FIBO Generation ===");
  console.log("📷 Detected View:", detectedView);
  console.log("📝 Prompt:", fiboParams.prompt.substring(0, 200) + "...");
  console.log("🎯 Objects:", allObjects.map(o => o.name));

  // First try image-to-image if we have a snapshot (preserves camera angle)
  if (snapshotBase64 && snapshotBase64.length > 100) {
    const bgColor = config.environment.backgroundColor;
    const img2imgResult = await tryImageToImage(apiKey, snapshotBase64, fiboParams.prompt, bgColor);
    if (img2imgResult) {
      return img2imgResult;
    }
  }

  console.log("Using text-to-image with JSON params...");
  console.log("FIBO JSON Params:", JSON.stringify(fiboParams, null, 2));

  try {
    // Send JSON to FIBO API
    const response = await fetch(`${FIBO_API_BASE}/text-to-image/base/2.3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_token': apiKey
      },
      body: JSON.stringify(fiboParams)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FIBO Error:", response.status, errorText);
      
      // If JSON params not supported, try with just prompt
      console.log("Trying with simplified prompt...");
      const fallbackResponse = await fetch(`${FIBO_API_BASE}/text-to-image/base/2.3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_token': apiKey
        },
        body: JSON.stringify({
          prompt: fiboParams.prompt,
          num_results: 1,
          sync: true
        })
      });

      if (!fallbackResponse.ok) {
        throw new Error(`FIBO API error: ${response.status}`);
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
