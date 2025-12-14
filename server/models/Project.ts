import mongoose, { Document, Schema } from 'mongoose';

// Lighting schema
const lightingSchema = new Schema(
  {
    ambientIntensity: { type: Number, default: 0.3 },
    ambientColor: { type: String, default: '#ffffff' },
    keyLightIntensity: { type: Number, default: 1.0 },
    keyLightColor: { type: String, default: '#ffffff' },
    keyLightPosition: { type: [Number], default: [5, 5, 5] },
    fillLightIntensity: { type: Number, default: 0.5 },
    fillLightColor: { type: String, default: '#e0e0e0' },
    fillLightPosition: { type: [Number], default: [-5, 2, 5] },
    rimLightIntensity: { type: Number, default: 0.2 },
    rimLightColor: { type: String, default: '#ffffff' },
    rimLightPosition: { type: [Number], default: [0, 5, -5] }
  },
  { _id: false }
);

// Environment schema
const environmentSchema = new Schema(
  {
    backgroundColor: { type: String, default: '#18181b' },
    floorRoughness: { type: Number, default: 0.5 },
    floorColor: { type: String, default: '#18181b' },
    platformType: {
      type: String,
      enum: ['none', 'cylinder', 'cube', 'round_table'],
      default: 'none'
    },
    platformColor: { type: String, default: '#333333' },
    platformMaterial: {
      type: String,
      enum: ['matte', 'glossy', 'wood', 'marble', 'metal'],
      default: 'matte'
    }
  },
  { _id: false }
);

// Config schema
const configSchema = new Schema(
  {
    lighting: { type: lightingSchema, default: () => ({}) },
    environment: { type: environmentSchema, default: () => ({}) },
    moodDescription: { type: String, default: 'Neutral clean studio lighting' }
  },
  { _id: false }
);

// Object part schema
const objectPartSchema = new Schema(
  {
    shape: {
      type: String,
      enum: ['cube', 'sphere', 'cylinder', 'cone', 'torus'],
      required: true
    },
    position: { type: [Number], default: [0, 0, 0] },
    rotation: { type: [Number], default: [0, 0, 0] },
    scale: { type: [Number], default: [1, 1, 1] },
    color: { type: String, default: '#ffffff' },
    roughness: { type: Number, default: 0.5 },
    metalness: { type: Number, default: 0.5 }
  },
  { _id: false }
);

// Studio object schema
const studioObjectSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['primitive', 'compound'], default: 'primitive' },
    shape: { type: String, enum: ['cube', 'sphere', 'torus', 'cylinder'] },
    parts: [objectPartSchema],
    color: { type: String, default: '#ffffff' },
    position: { type: [Number], default: [0, 0, 0] },
    rotation: { type: [Number], default: [0, 0, 0] },
    scale: { type: [Number], default: [1, 1, 1] },
    roughness: { type: Number, default: 0.5 },
    metalness: { type: Number, default: 0.5 }
  },
  { _id: false }
);

// Generated image schema
const generatedImageSchema = new Schema(
  {
    id: { type: String, required: true },
    url: { type: String, required: true },
    promptUsed: { type: String },
    timestamp: { type: Number, default: Date.now },
    objectName: { type: String }
  },
  { _id: false }
);

// Consistency settings schema
const consistencySettingsSchema = new Schema(
  {
    lockCamera: { type: Boolean, default: true },
    lockLighting: { type: Boolean, default: true },
    lockBackground: { type: Boolean, default: true },
    mode: {
      type: String,
      enum: ['strict_catalog', 'creative_campaign'],
      default: 'strict_catalog'
    }
  },
  { _id: false }
);

// Main Project interface
export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  config: {
    lighting: Record<string, unknown>;
    environment: Record<string, unknown>;
    moodDescription: string;
  };
  objects: Record<string, unknown>[];
  images: Record<string, unknown>[];
  consistencySettings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: 100
    },
    config: {
      type: configSchema,
      default: () => ({})
    },
    objects: {
      type: [studioObjectSchema] as any,
      default: []
    },
    images: {
      type: [generatedImageSchema] as any,
      default: []
    },
    consistencySettings: {
      type: consistencySettingsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
projectSchema.index({ userId: 1, updatedAt: -1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
