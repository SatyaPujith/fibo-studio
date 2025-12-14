import React from 'react';
import { X, Lock, Unlock, Settings2, Info } from 'lucide-react';
import { ConsistencySettings } from '../types';

interface ProductionSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConsistencySettings;
  onUpdate: (settings: ConsistencySettings) => void;
}

export const ProductionSettingsDialog: React.FC<ProductionSettingsDialogProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdate 
}) => {
  if (!isOpen) return null;

  const toggle = (key: keyof ConsistencySettings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const setMode = (mode: 'strict_catalog' | 'creative_campaign') => {
    onUpdate({ ...settings, mode });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        
        <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            Production Consistency
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="bg-indigo-900/20 border border-indigo-500/20 p-3 rounded-lg flex gap-3 text-indigo-200 text-sm">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>Locks ensure that your generated images maintain the exact look across multiple batches, perfect for catalogs.</p>
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Lock Camera Angle</span>
                    <span className="text-xs text-zinc-500">Maintain identical perspective</span>
                </div>
                <button 
                    onClick={() => toggle('lockCamera')}
                    className={`p-2 rounded-lg transition-colors ${settings.lockCamera ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                    {settings.lockCamera ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
             </div>

             <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Lock Lighting Setup</span>
                    <span className="text-xs text-zinc-500">Keep shadows and highlights fixed</span>
                </div>
                <button 
                    onClick={() => toggle('lockLighting')}
                    className={`p-2 rounded-lg transition-colors ${settings.lockLighting ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                    {settings.lockLighting ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
             </div>

             <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Lock Background</span>
                    <span className="text-xs text-zinc-500">Prevent environment changes</span>
                </div>
                <button 
                    onClick={() => toggle('lockBackground')}
                    className={`p-2 rounded-lg transition-colors ${settings.lockBackground ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                    {settings.lockBackground ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
             </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <span className="text-xs font-medium text-zinc-400 uppercase block mb-3">Generation Mode</span>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setMode('strict_catalog')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        settings.mode === 'strict_catalog' 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                >
                    Strict Catalog
                </button>
                <button
                    onClick={() => setMode('creative_campaign')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        settings.mode === 'creative_campaign' 
                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                >
                    Creative Campaign
                </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};