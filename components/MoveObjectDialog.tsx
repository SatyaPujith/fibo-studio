import React, { useState, useEffect } from 'react';
import { X, Move, Check } from 'lucide-react';
import { StudioObject } from '../types';

interface MoveObjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (newPosition: [number, number, number]) => void;
  object: StudioObject;
}

export const MoveObjectDialog: React.FC<MoveObjectDialogProps> = ({ 
  isOpen, 
  onClose, 
  onMove, 
  object 
}) => {
  const [pos, setPos] = useState<[string, string, string]>(['0', '0', '0']);

  useEffect(() => {
    if (isOpen && object) {
      setPos([
        object.position[0].toFixed(2),
        object.position[1].toFixed(2),
        object.position[2].toFixed(2)
      ]);
    }
  }, [isOpen, object]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseFloat(pos[0]) || 0;
    const y = parseFloat(pos[1]) || 0;
    const z = parseFloat(pos[2]) || 0;
    onMove([x, y, z]);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        
        <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Move className="w-4 h-4 text-indigo-400" />
            Move Object
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-sm text-zinc-400 mb-2">
            Target: <span className="text-white font-medium">{object.name}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 uppercase font-bold mb-1.5 text-center">X Axis</label>
              <input 
                type="number" 
                step="0.1"
                value={pos[0]}
                onChange={(e) => setPos([e.target.value, pos[1], pos[2]])}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-center text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase font-bold mb-1.5 text-center">Y Axis</label>
               <input 
                type="number" 
                step="0.1"
                value={pos[1]}
                onChange={(e) => setPos([pos[0], e.target.value, pos[2]])}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-center text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase font-bold mb-1.5 text-center">Z Axis</label>
               <input 
                type="number" 
                step="0.1"
                value={pos[2]}
                onChange={(e) => setPos([pos[0], pos[1], e.target.value])}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-center text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Move To Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};