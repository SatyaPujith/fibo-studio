
import { StudioConfig, StudioObject } from './types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  moodDescription: "Neutral clean studio lighting",
  lighting: {
    ambientIntensity: 0.3,
    ambientColor: "#ffffff",
    keyLightIntensity: 1.0,
    keyLightColor: "#ffffff",
    keyLightPosition: [5, 5, 5],
    fillLightIntensity: 0.5,
    fillLightColor: "#e0e0e0",
    fillLightPosition: [-5, 2, 5],
    rimLightIntensity: 0.2,
    rimLightColor: "#ffffff",
    rimLightPosition: [0, 5, -5],
  },
  environment: {
    backgroundColor: "#18181b", // Zinc 900
    floorRoughness: 0.5,
    floorColor: "#18181b",
    platformType: 'none',
    platformColor: '#333333',
    platformMaterial: 'matte'
  }
};

export const INITIAL_OBJECT: StudioObject = {
  id: uuidv4(),
  name: 'Demo Product (Torus)',
  type: 'primitive',
  shape: 'torus',
  color: '#ffffff',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  roughness: 0.5,
  metalness: 0.5
};

export const MOCK_PROJECTS = [
  {
    id: uuidv4(),
    name: 'Cosmetics Campaign',
    lastUpdated: Date.now() - 100000,
    config: { ...DEFAULT_STUDIO_CONFIG, moodDescription: 'Soft pastel luxury' },
    objects: [{ ...INITIAL_OBJECT }],
    images: []
  },
  {
    id: uuidv4(),
    name: 'Tech Gadget Launch',
    lastUpdated: Date.now() - 5000000,
    config: {
      ...DEFAULT_STUDIO_CONFIG,
      environment: { ...DEFAULT_STUDIO_CONFIG.environment, backgroundColor: '#000000' },
      moodDescription: 'High contrast tech'
    },
    objects: [{ ...INITIAL_OBJECT, shape: 'cube', name: 'Black Box', roughness: 0.2, metalness: 0.8 } as StudioObject],
    images: []
  }
];