
export interface StudioLighting {
  ambientIntensity: number;
  ambientColor: string;
  keyLightIntensity: number;
  keyLightColor: string;
  keyLightPosition: [number, number, number];
  fillLightIntensity: number;
  fillLightColor: string;
  fillLightPosition: [number, number, number];
  rimLightIntensity: number;
  rimLightColor: string;
  rimLightPosition: [number, number, number];
}

export interface StudioEnvironment {
  backgroundColor: string;
  floorRoughness: number;
  floorColor: string;
  platformType: 'none' | 'cylinder' | 'cube' | 'round_table';
  platformColor: string;
  platformMaterial: 'matte' | 'glossy' | 'wood' | 'marble' | 'metal';
}

export interface ConsistencySettings {
  lockCamera: boolean;
  lockLighting: boolean;
  lockBackground: boolean;
  mode: 'strict_catalog' | 'creative_campaign';
}

export interface StudioCamera {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  lookAt: [number, number, number];
}

export interface StudioConfig {
  lighting: StudioLighting;
  environment: StudioEnvironment;
  moodDescription: string; // Used for AI generation context
  studioCamera?: StudioCamera; // Production camera for image generation
}

export interface ObjectPart {
  shape: 'cube' | 'sphere' | 'cylinder' | 'cone' | 'torus';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  roughness: number;
  metalness: number;
}

export interface StudioObject {
  id: string;
  name: string;
  type: 'primitive' | 'compound'; // Changed 'custom' to 'compound' for multi-part objects
  shape?: 'cube' | 'sphere' | 'torus' | 'cylinder'; // Legacy simple shape
  parts?: ObjectPart[]; // New: List of primitives that make up the object
  color: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  roughness?: number;
  metalness?: number;
}

export interface GeneratedImage {
  id: string;
  url: string; 
  promptUsed: string;
  timestamp: number;
  objectName: string;
}

export interface Project {
  id: string;
  name: string;
  lastUpdated: number;
  config: StudioConfig;
  objects: StudioObject[];
  images: GeneratedImage[];
  consistencySettings?: ConsistencySettings; // New field
}

export interface User {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
}

export type ViewMode = 'landing' | 'auth' | 'dashboard' | 'studio';
