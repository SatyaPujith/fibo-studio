# FIBO Integration Guide

This document explains how FIBO Studio integrates with BRIA's FIBO (Foundation Image Building Orchestrator) for AI-powered photorealistic image generation.

## What is FIBO?

FIBO is BRIA's foundation model for image generation that offers **JSON-native control** over the generation process. Unlike traditional text-to-image models that rely solely on prompt engineering, FIBO accepts structured parameters for precise control over:

- Camera angles and positioning
- Lighting type and direction
- Color palettes
- Composition and framing
- Style and quality settings

## How FIBO Studio Uses FIBO

### The Problem with Traditional AI Image Generation

Traditional text-to-image models have limitations for product photography:

1. **Inconsistent camera angles** - "front view" might mean different things each generation
2. **Unpredictable composition** - Objects may appear in different positions
3. **Lighting variations** - Hard to maintain consistent studio lighting
4. **Extra objects** - Models often add unwanted props or decorations

### Our Solution: 3D Scene → JSON Parameters → FIBO

FIBO Studio solves these problems by:

1. **Visual Scene Design** - Users compose their scene in a real-time 3D editor
2. **Automatic Parameter Extraction** - The app extracts exact camera angles, lighting, and composition
3. **JSON-Native Generation** - These parameters are sent to FIBO as structured JSON
4. **Consistent Results** - FIBO generates images matching the exact scene setup

## Technical Implementation

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   3D Scene      │────▶│  Parameter       │────▶│   FIBO API      │
│   (Three.js)    │     │  Extraction      │     │   Request       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Camera Position │     │ JSON Parameters  │     │ Generated       │
│ Object Rotation │     │ (scene, camera,  │     │ Photorealistic  │
│ Lighting Setup  │     │  lighting, etc.) │     │ Image           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Camera Context Extraction

The `Scene3D` component captures precise camera data:

```typescript
// From components/Scene3D.tsx
getCameraContext: () => {
  const pos = camera.position;
  const r = pos.length();
  
  // Calculate precise angles in degrees
  const theta = Math.atan2(pos.x, pos.z); // Horizontal angle (azimuth)
  const phi = Math.acos(pos.y / r);       // Vertical angle (elevation)
  
  const horizontalDeg = Math.round(theta * 180 / Math.PI);
  const verticalDeg = Math.round(phi * 180 / Math.PI);
  
  return JSON.stringify({
    horizontal: horizontalDesc,
    vertical: verticalDesc,
    distance: distance,
    horizontalDeg: horizontalDeg,
    verticalDeg: verticalDeg,
    position: { x, y, z }
  });
}
```

### FIBO JSON Parameter Building

The `fiboService.ts` converts scene data to FIBO's JSON format:

```typescript
// From services/fiboService.ts
const buildFiboJsonParams = (config, objects, style, cameraContext) => {
  // Parse camera data
  const cameraData = JSON.parse(cameraContext);
  
  // Convert to FIBO format
  const getCameraAngle = (): string => {
    const v = cameraData.verticalDeg;
    if (v < 30) return "bird_eye";
    if (v < 60) return "high_angle";
    if (v > 120) return "worm_eye";
    if (v > 100) return "low_angle";
    return "eye_level";
  };

  return {
    prompt: detailedPrompt,
    num_results: 1,
    sync: true,
    
    // FIBO JSON-Native Scene Control
    scene: {
      subject: objectName,
      subject_description: `single ${objectName}, isolated`,
      background: bgColorName,
      environment: "studio"
    },
    
    // FIBO JSON-Native Camera Control
    camera: {
      angle: getCameraAngle(),      // "eye_level", "high_angle", etc.
      shot_type: getShotType(),     // "close_up", "medium_shot", etc.
      position: getCameraPosition() // "front", "side", "three_quarter"
    },
    
    // FIBO JSON-Native Lighting Control
    lighting: {
      type: getLightingType(),      // "studio", "dramatic", "soft"
      direction: getLightingDirection(),
      intensity: "medium",
      color_temperature: "neutral"
    },
    
    // FIBO JSON-Native Color Control
    color_palette: {
      primary: mainObject?.color,
      background: bgColor,
      mood: "vibrant"
    },
    
    // FIBO JSON-Native Composition Control
    composition: {
      framing: "centered",
      orientation: "square"
    },
    
    // FIBO JSON-Native Style Control
    style: {
      type: "photorealistic",
      quality: "ultra"
    }
  };
};
```

### API Request

```typescript
// FIBO API endpoint
const FIBO_API_BASE = "https://engine.prod.bria-api.com/v1";

const response = await fetch(`${FIBO_API_BASE}/text-to-image/base/2.3`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'api_token': apiKey  // FIBO uses 'api_token' header
  },
  body: JSON.stringify(fiboParams)
});

const data = await response.json();
// Returns: { result: [{ urls: ["https://...generated-image.png"] }] }
```

## FIBO Parameters Reference

### Camera Angles

| Value | Description | Vertical Degrees |
|-------|-------------|------------------|
| `bird_eye` | Top-down view | < 30° |
| `high_angle` | Looking down | 30° - 60° |
| `eye_level` | Straight on | 60° - 100° |
| `low_angle` | Looking up | 100° - 120° |
| `worm_eye` | Extreme low | > 120° |

### Camera Positions

| Value | Description | Horizontal Degrees |
|-------|-------------|-------------------|
| `front` | Direct front view | < 30° |
| `three_quarter` | Angled view | 30° - 60° or 120° - 150° |
| `side` | Side profile | 60° - 120° |
| `back` | Behind view | > 150° |

### Shot Types

| Value | Description | Camera Distance |
|-------|-------------|-----------------|
| `close_up` | Fills frame | < 3 units |
| `medium_shot` | Some space | 3 - 5 units |
| `full_shot` | Complete object | 5 - 8 units |
| `wide_shot` | With environment | > 8 units |

### Lighting Types

| Value | Description | Key Light Intensity |
|-------|-------------|---------------------|
| `soft` | Low contrast | < 0.5 |
| `studio` | Balanced | 0.5 - 1.5 |
| `dramatic` | High contrast | > 1.5 |

### Style Quality

| Value | Description |
|-------|-------------|
| `standard` | Basic quality |
| `high` | Good quality |
| `ultra` | Maximum quality (8K) |

## Example Generated Parameters

When a user positions a "Cricket Bat" at eye level, front view, with studio lighting:

```json
{
  "prompt": "Single Cricket Bat, brown colored, standing upright, straight-on eye level view, directly from the front, full shot showing complete object, solid white background, light gray floor surface, professional product photography, photorealistic rendering, 8K resolution, studio lighting, commercial quality, single isolated object only, no other objects in scene, no props, no decorations, centered composition",
  "num_results": 1,
  "sync": true,
  "scene": {
    "subject": "Cricket Bat",
    "subject_description": "brown Cricket Bat, upright, isolated on white background",
    "background": "white",
    "environment": "studio"
  },
  "camera": {
    "angle": "eye_level",
    "shot_type": "full_shot",
    "position": "front"
  },
  "lighting": {
    "type": "studio",
    "direction": "front",
    "intensity": "medium",
    "color_temperature": "neutral"
  },
  "color_palette": {
    "primary": "#8B4513",
    "background": "#ffffff",
    "secondary": "#f4f4f5",
    "mood": "vibrant"
  },
  "composition": {
    "framing": "centered",
    "orientation": "square"
  },
  "style": {
    "type": "photorealistic",
    "quality": "ultra"
  }
}
```

## Benefits of This Approach

### 1. Deterministic Control
Unlike prompt-only generation, the JSON parameters ensure consistent results:
- Same camera angle = Same perspective every time
- Same lighting setup = Consistent shadows and highlights

### 2. Visual Feedback Loop
Users see exactly what they're asking for in the 3D preview before generation.

### 3. Production-Ready Workflow
- Batch generate variations with consistent settings
- Maintain brand consistency across product lines
- Precise control for e-commerce requirements

### 4. No Prompt Engineering Required
Users interact with familiar 3D controls instead of learning complex prompt syntax.

## Getting a FIBO API Key

1. Visit [BRIA AI](https://bria.ai/)
2. Sign up for an account
3. Navigate to API settings
4. Generate an API key
5. Add to your `.env.local`:
   ```
   VITE_FIBO_API_KEY=your_api_key_here
   ```

## Resources

- [BRIA FIBO Documentation](https://docs.bria.ai/)
- [FIBO on Hugging Face](https://huggingface.co/briaai)
- [BRIA GitHub](https://github.com/bria-ai)
- [BRIA Discord Community](https://discord.gg/briaai)

---

This integration demonstrates how FIBO's JSON-native approach enables precise, production-ready image generation that traditional text-to-image models cannot achieve.
