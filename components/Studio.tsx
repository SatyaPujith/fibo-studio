import React, { useState, useEffect, useRef } from 'react';
import { Project, StudioConfig, StudioObject, GeneratedImage, StudioLighting, StudioEnvironment, ConsistencySettings } from '../types';
import { Scene3D, Scene3DRef } from './Scene3D';
import { translatePromptToStudioConfig, generateStudioImage } from '../services/geminiService';
import { BatchGenerationDialog } from './BatchGenerationDialog';
import { MoveObjectDialog } from './MoveObjectDialog';
import { ProductionSettingsDialog } from './ProductionSettingsDialog';
import { ArrowLeft, Send, Sparkles, Box, Camera, Download, RefreshCw, LayoutTemplate, Layers, Wand2, Undo2, Redo2, Move, RotateCw, Maximize, MousePointer2, ArrowDownToLine, RefreshCcw, Sun, Palette, Monitor, Trash2, Navigation, Settings2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_STUDIO_CONFIG } from '../constants';

interface StudioProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
}

interface StudioHistoryState {
    config: StudioConfig;
    objects: StudioObject[];
}

const MOOD_PRESETS: Record<string, Partial<StudioConfig>> = {
    'Clean': {
        moodDescription: 'Clean white minimalist studio',
        environment: { ...DEFAULT_STUDIO_CONFIG.environment, backgroundColor: '#f4f4f5', floorColor: '#f4f4f5' },
        lighting: { ...DEFAULT_STUDIO_CONFIG.lighting, keyLightColor: '#ffffff', fillLightColor: '#e4e4e7', ambientIntensity: 0.6 }
    },
    'Dark': {
        moodDescription: 'Dramatic dark luxury studio',
        environment: { ...DEFAULT_STUDIO_CONFIG.environment, backgroundColor: '#09090b', floorColor: '#09090b' },
        lighting: { ...DEFAULT_STUDIO_CONFIG.lighting, keyLightColor: '#ffffff', fillLightColor: '#27272a', ambientIntensity: 0.2 }
    },
    'Warm': {
        moodDescription: 'Warm golden hour sunlight',
        environment: { ...DEFAULT_STUDIO_CONFIG.environment, backgroundColor: '#2a221e', floorColor: '#2a221e' },
        lighting: { ...DEFAULT_STUDIO_CONFIG.lighting, keyLightColor: '#ffba75', fillLightColor: '#5c3a2e', ambientIntensity: 0.4 }
    },
    'Cool': {
        moodDescription: 'Futuristic cool blue neon',
        environment: { ...DEFAULT_STUDIO_CONFIG.environment, backgroundColor: '#0f172a', floorColor: '#0f172a' },
        lighting: { ...DEFAULT_STUDIO_CONFIG.lighting, keyLightColor: '#60a5fa', fillLightColor: '#1e3a8a', ambientIntensity: 0.3 }
    }
};

const DEFAULT_CONSISTENCY: ConsistencySettings = {
    lockCamera: true,
    lockLighting: true,
    lockBackground: true,
    mode: 'strict_catalog'
};

const useUndoRedo = <T,>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);
  
    const setState = (newState: T) => {
      const next = history.slice(0, index + 1);
      next.push(newState);
      setHistory(next);
      setIndex(next.length - 1);
    };
  
    const undo = () => {
      if (index > 0) setIndex(prev => prev - 1);
    };
    
    const redo = () => {
      if (index < history.length - 1) setIndex(prev => prev + 1);
    };
  
    return {
      state: history[index],
      pushState: setState,
      undo,
      redo,
      canUndo: index > 0,
      canRedo: index < history.length - 1
    };
  };

export const Studio: React.FC<StudioProps> = ({ project, onUpdateProject, onBack }) => {
  const { state: historyState, pushState, undo, redo, canUndo, canRedo } = useUndoRedo<StudioHistoryState>({
      config: project.config,
      objects: project.objects
  });

  const { config, objects } = historyState;

  const [activeObjectId, setActiveObjectId] = useState<string>(project.objects[0]?.id || '');
  const [images, setImages] = useState<GeneratedImage[]>(project.images);
  const [consistencySettings, setConsistencySettings] = useState<ConsistencySettings>(project.consistencySettings || DEFAULT_CONSISTENCY);
  
  const [prompt, setPrompt] = useState('');
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationStyle, setGenerationStyle] = useState<'plain' | 'professional'>('professional');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale' | undefined>(undefined);

  const sceneRef = useRef<Scene3DRef>(null);

  const activeObject = objects.find(o => o.id === activeObjectId) || objects[0];

  useEffect(() => {
    onUpdateProject({
      ...project,
      config,
      objects,
      images,
      consistencySettings, // Save settings with project
      lastUpdated: Date.now()
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, objects, images, consistencySettings]);

  const updateConfig = (newConfig: StudioConfig) => {
      pushState({ config: newConfig, objects });
  };

  const updateLighting = (updates: Partial<StudioLighting>) => {
      updateConfig({ ...config, lighting: { ...config.lighting, ...updates } });
  };

  const updateEnvironment = (updates: Partial<StudioEnvironment>) => {
      updateConfig({ ...config, environment: { ...config.environment, ...updates } });
  };

  const handleApplyPreset = (name: string) => {
      const preset = MOOD_PRESETS[name];
      if (preset) {
          updateConfig({
              ...config,
              moodDescription: preset.moodDescription || config.moodDescription,
              environment: { ...config.environment, ...(preset.environment || {}) },
              lighting: { ...config.lighting, ...(preset.lighting || {}) }
          });
      }
  };

  const handleTransformChange = (id: string, updates: Partial<StudioObject>) => {
      const newObjects = objects.map(obj => 
          obj.id === id ? { ...obj, ...updates } : obj
      );
      pushState({ config, objects: newObjects });
  };

  const handleSnapToGround = () => {
      handleTransformChange(activeObjectId, { position: [activeObject.position[0], 0, activeObject.position[2]] });
  };

  const handleResetRotation = () => {
      handleTransformChange(activeObjectId, { rotation: [0, 0, 0] });
  };

  const handleDeleteObject = () => {
    if (objects.length <= 1) {
        alert("Cannot delete the last object.");
        return;
    }
    const newObjects = objects.filter(o => o.id !== activeObjectId);
    pushState({ config, objects: newObjects });
    setActiveObjectId(newObjects[0].id);
  };

  const handleApplyPrompt = async () => {
    if (!prompt.trim()) return;
    setIsProcessingPrompt(true);
    setProcessingStatus('Analyzing Request...');
    
    try {
      const result = await translatePromptToStudioConfig(config, activeObject, prompt);
      
      let newConfig = result.config;
      let newObjects = [...objects];

      if (result.objectAction) {
        const { type, properties } = result.objectAction;
        
        // Prepare new properties
        const newProperties: Partial<StudioObject> = { ...properties };

        if (type === 'UPDATE') {
          newObjects = objects.map(obj => 
            obj.id === activeObjectId 
              ? { ...obj, ...newProperties }
              : obj
          );
        } else if (type === 'CREATE') {
          const newObj: StudioObject = {
            id: uuidv4(),
            name: newProperties.name || 'New Object',
            type: (newProperties.type as 'primitive' | 'compound') || 'primitive',
            shape: (newProperties.shape as any) || 'cube',
            parts: newProperties.parts || [],
            color: newProperties.color || '#ffffff',
            position: newProperties.position || [0,0,0],
            rotation: newProperties.rotation || [0,0,0],
            scale: newProperties.scale || [1,1,1],
            roughness: newProperties.roughness ?? 0.5,
            metalness: newProperties.metalness ?? 0.5
          };
          newObjects = [...objects, newObj];
          setActiveObjectId(newObj.id);
        }
      }

      pushState({ config: newConfig, objects: newObjects });

    } catch (e) {
      console.error(e);
      alert('Failed to update studio. Try again.');
    } finally {
      setIsProcessingPrompt(false);
      setProcessingStatus('');
    }
  };

  const handleBatchGenerate = async (prompts: string[]) => {
    if (!sceneRef.current) return;
    setIsGeneratingImage(true);
    
    try {
      const snapshot = sceneRef.current.captureSnapshot();
      const cameraContext = sceneRef.current.getCameraContext();
      
      for (const variantPrompt of prompts) {
        // Use prompt if it's different from object name, else undefined to signal "standard generation"
        const isVariation = variantPrompt !== activeObject.name;
        
        const imageUrl = await generateStudioImage(
          config, 
          objects, // Pass all objects to render full scene
          snapshot, 
          generationStyle,
          cameraContext,
          isVariation ? variantPrompt : undefined,
          consistencySettings // Pass settings
        );

        const newImage: GeneratedImage = {
          id: uuidv4(),
          url: imageUrl,
          promptUsed: isVariation ? `${variantPrompt} (${generationStyle})` : `${config.moodDescription} (${generationStyle})`,
          timestamp: Date.now(),
          objectName: isVariation ? variantPrompt : objects.map(o => o.name).join(', ')
        };
        
        // Add image to start of list
        setImages(prev => [newImage, ...prev]);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate images.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAddObject = () => {
    const newObj: StudioObject = {
      id: uuidv4(),
      name: `Object ${objects.length + 1}`,
      type: 'primitive',
      shape: 'sphere',
      color: '#ffffff',
      position: [objects.length * 1.5, 0, 0], // Offset position for visibility
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      roughness: 0.5,
      metalness: 0.5
    };
    const newObjects = [...objects, newObj];
    pushState({ config, objects: newObjects });
    setActiveObjectId(newObj.id);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50 flex-shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="truncate font-semibold text-white">{project.name}</div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 text-sm text-zinc-500 font-medium tracking-wider uppercase">
            <span>Objects</span>
            <button onClick={handleAddObject} className="text-indigo-400 hover:text-indigo-300">
                <Sparkles className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {objects.map(obj => (
              <button
                key={obj.id}
                onClick={() => setActiveObjectId(obj.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
                  obj.id === activeObjectId 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                    : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <Box className="w-4 h-4" />
                <div className="flex-1 text-left truncate">{obj.name}</div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color }} />
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-800">
             <div className="text-xs text-zinc-600 mb-2 font-mono uppercase">Studio Status</div>
             <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between">
                    <span>Mood</span>
                    <span className="text-zinc-200">{config.moodDescription.slice(0, 15)}...</span>
                </div>
                <div className="flex justify-between">
                    <span>Consistency</span>
                    <span className={`text-xs ${consistencySettings.mode === 'strict_catalog' ? 'text-indigo-400' : 'text-zinc-400'}`}>
                        {consistencySettings.mode === 'strict_catalog' ? 'Strict' : 'Creative'}
                    </span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* CENTER PANEL */}
      <div className="flex-1 flex flex-col bg-black relative min-w-0">
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950">
            <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-2"><LayoutTemplate className="w-4 h-4" /> Studio View</span>
                
                {/* Transform Tools */}
                <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                    <button 
                        onClick={() => setTransformMode(undefined)}
                        className={`p-1.5 rounded-md transition-colors ${!transformMode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Select"
                    >
                        <MousePointer2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                    <button 
                        onClick={() => setTransformMode('translate')}
                        className={`p-1.5 rounded-md transition-colors ${transformMode === 'translate' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Move"
                    >
                        <Move className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setTransformMode('rotate')}
                        className={`p-1.5 rounded-md transition-colors ${transformMode === 'rotate' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Rotate"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setTransformMode('scale')}
                        className={`p-1.5 rounded-md transition-colors ${transformMode === 'scale' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        title="Scale"
                    >
                        <Maximize className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                     <button 
                        onClick={handleSnapToGround}
                        className="p-1.5 rounded-md transition-colors text-zinc-400 hover:text-white"
                        title="Snap to Ground"
                    >
                        <ArrowDownToLine className="w-4 h-4" />
                    </button>
                     <button 
                        onClick={handleResetRotation}
                        className="p-1.5 rounded-md transition-colors text-zinc-400 hover:text-white"
                        title="Reset Rotation"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setIsMoveDialogOpen(true)}
                        className="p-1.5 rounded-md transition-colors text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800"
                        title="Move Object To..."
                    >
                        <Navigation className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className={`p-2 rounded-lg transition-colors ${consistencySettings.mode === 'strict_catalog' ? 'text-indigo-400 bg-indigo-900/20' : 'text-zinc-400 hover:text-white'}`}
                    title="Production Settings"
                >
                    <Settings2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                <button 
                    onClick={handleDeleteObject}
                    className="p-2 hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                    title="Delete Object"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-zinc-800 mx-1"></div>
                <button 
                    onClick={undo} 
                    disabled={!canUndo}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Undo"
                >
                    <Undo2 className="w-4 h-4" />
                </button>
                <button 
                    onClick={redo} 
                    disabled={!canRedo}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Redo"
                >
                    <Redo2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        <div className="flex-1 relative">
            <Scene3D 
              ref={sceneRef}
              config={config} 
              objects={objects}
              activeObjectId={activeObjectId}
              onObjectSelect={setActiveObjectId}
              transformMode={transformMode}
              onTransformChange={handleTransformChange}
            />
            
            {/* Loading Overlay */}
            {isProcessingPrompt && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center animate-pulse">
                        <Sparkles className="w-8 h-8 text-indigo-500 mb-2" />
                        <span className="text-indigo-200 font-medium">{processingStatus}</span>
                    </div>
                </div>
            )}
        </div>
        
        {/* Batch Generation Dialog */}
        <BatchGenerationDialog 
            isOpen={isBatchModalOpen} 
            onClose={() => setIsBatchModalOpen(false)}
            onGenerate={handleBatchGenerate}
            currentObjectName={activeObject.name}
        />

        {/* Move Object Dialog */}
        <MoveObjectDialog
            isOpen={isMoveDialogOpen}
            onClose={() => setIsMoveDialogOpen(false)}
            onMove={(newPos) => handleTransformChange(activeObjectId, { position: newPos })}
            object={activeObject}
        />

        {/* Production Settings Dialog */}
        <ProductionSettingsDialog
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={consistencySettings}
            onUpdate={setConsistencySettings}
        />
      </div>

      {/* RIGHT PANEL */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900/50 flex flex-col flex-shrink-0 h-full">
        {/* Scrollable Control Area with Max Height Limit to preserve Gallery space */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-900 overflow-y-auto flex-shrink-0 max-h-[60%]">
          <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" />
            Studio Director
          </label>
          <div className="relative mb-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe studio changes or object updates..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-zinc-500"
              onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleApplyPrompt();
                  }
              }}
            />
            <button
              onClick={handleApplyPrompt}
              disabled={isProcessingPrompt || !prompt.trim()}
              className="absolute bottom-3 right-3 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessingPrompt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {/* STUDIO SETTINGS */}
          <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
              <label className="text-xs font-medium text-zinc-400 mb-3 block uppercase tracking-wider flex items-center gap-2">
                  <Sun className="w-3 h-3" /> Lighting & Mood
              </label>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                  {Object.keys(MOOD_PRESETS).map(name => (
                      <button 
                        key={name}
                        onClick={() => handleApplyPreset(name)}
                        className="text-[10px] py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 hover:text-white transition-colors"
                      >
                          {name}
                      </button>
                  ))}
              </div>

              <div className="space-y-3">
                  <div>
                      <div className="flex justify-between text-xs mb-1">
                          <span>Key Intensity</span>
                          <span>{(config.lighting.keyLightIntensity).toFixed(1)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0" max="3" step="0.1"
                          value={config.lighting.keyLightIntensity}
                          onChange={(e) => updateLighting({ keyLightIntensity: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                  </div>
                  <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">Key Color</span>
                      <input 
                          type="color" 
                          value={config.lighting.keyLightColor}
                          onChange={(e) => updateLighting({ keyLightColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                      />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700/50">
                      <span className="text-xs text-zinc-400">Background</span>
                      <input 
                          type="color" 
                          value={config.environment.backgroundColor}
                          onChange={(e) => updateEnvironment({ backgroundColor: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                      />
                  </div>
              </div>
          </div>

          {/* OBJECT SETTINGS */}
          <div className="bg-zinc-800/50 rounded-lg p-3 mb-6">
            <label className="text-xs font-medium text-zinc-400 mb-2 block uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-3 h-3" /> Material
            </label>
            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span>Roughness</span>
                        <span>{(activeObject.roughness ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={activeObject.roughness ?? 0.5} 
                        onChange={(e) => handleTransformChange(activeObjectId, { roughness: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span>Metalness</span>
                        <span>{(activeObject.metalness ?? 0.5).toFixed(2)}</span>
                    </div>
                     <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={activeObject.metalness ?? 0.5} 
                        onChange={(e) => handleTransformChange(activeObjectId, { metalness: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
          </div>
          
          <div className="space-y-3">
             {/* Style Selector */}
             <div className="flex bg-zinc-800 p-1 rounded-lg">
                <button 
                    onClick={() => setGenerationStyle('plain')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${generationStyle === 'plain' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    Plain
                </button>
                <button 
                    onClick={() => setGenerationStyle('professional')}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${generationStyle === 'professional' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                    Professional
                </button>
             </div>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              disabled={isGeneratingImage || isProcessingPrompt}
              className="w-full bg-white hover:bg-zinc-200 text-black py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-white/10"
            >
              {isGeneratingImage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Generate Image
            </button>
          </div>
        </div>

        {/* Gallery fills remaining space */}
        <div className="flex-1 overflow-y-auto p-5 border-t border-zinc-800 min-h-0">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Production Gallery</h3>
            <div className="grid grid-cols-1 gap-4">
                {images.map(img => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
                        <img src={img.url} alt="Generated" className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a href={img.url} download={`fibo-studio-${img.id}.png`} className="p-2 bg-white text-black rounded-full hover:bg-zinc-200">
                                <Download className="w-4 h-4" />
                            </a>
                        </div>
                        <div className="p-2 border-t border-zinc-900">
                            <p className="text-[10px] text-zinc-500 truncate">{new Date(img.timestamp).toLocaleTimeString()}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{img.promptUsed}</p>
                        </div>
                    </div>
                ))}
                {images.length === 0 && (
                    <div className="text-center py-10 text-zinc-600 text-sm">
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No images generated yet.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};