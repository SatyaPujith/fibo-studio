import React, { useState } from 'react';
import { Layers, Sparkles, X, Copy, Plus } from 'lucide-react';

interface BatchGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompts: string[]) => void;
  currentObjectName: string;
}

export const BatchGenerationDialog: React.FC<BatchGenerationDialogProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate, 
  currentObjectName 
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [variations, setVariations] = useState<string>('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (mode === 'single') {
      onGenerate([currentObjectName]); // Just use the current object name/state
    } else {
      // Split by new line, filter empty
      const prompts = variations.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      if (prompts.length === 0) {
        onGenerate([currentObjectName]);
      } else {
        onGenerate(prompts);
      }
    }
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Generation Options
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex bg-zinc-800 p-1 rounded-lg mb-6">
            <button 
              onClick={() => setMode('single')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${mode === 'single' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Current View
            </button>
            <button 
              onClick={() => setMode('batch')}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${mode === 'batch' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              Item Sets / Variants
            </button>
          </div>

          {mode === 'single' ? (
            <div className="text-zinc-400 text-sm space-y-4">
              <p>Generate a high-fidelity render of the current <strong>{currentObjectName}</strong> setup.</p>
              <div className="bg-zinc-800/50 p-3 rounded border border-zinc-800 text-xs">
                <span className="text-zinc-500 block mb-1 uppercase tracking-wider">Note</span>
                Lighting, background, and camera angle will be preserved exactly as seen in the viewport.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-zinc-300">
                Enter variations (one per line):
              </label>
              <textarea
                value={variations}
                onChange={(e) => setVariations(e.target.value)}
                placeholder={`Red matte finish\nBlue metallic finish\nWooden texture\nA completely different object (e.g. Vintage Camera)`}
                className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder-zinc-600"
              />
              <p className="text-xs text-zinc-500">
                The studio environment (lighting/background) remains constant, but the object in the image will change based on your prompts.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            {mode === 'single' ? 'Generate Image' : `Generate Batch`}
          </button>
        </div>
      </div>
    </div>
  );
};