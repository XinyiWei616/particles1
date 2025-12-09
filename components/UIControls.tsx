import React from 'react';
import { ShapeType } from '../types';

interface UIControlsProps {
  currentShape: ShapeType;
  setShape: (s: ShapeType) => void;
  currentColor: string;
  setColor: (c: string) => void;
  isAiConnected: boolean;
  onToggleFullscreen: () => void;
}

const UIControls: React.FC<UIControlsProps> = ({ 
  currentShape, 
  setShape, 
  currentColor, 
  setColor, 
  isAiConnected,
  onToggleFullscreen
}) => {
  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-4 items-end pointer-events-auto">
      
      {/* Status Badge */}
      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
        isAiConnected ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-red-500/20 border-red-500 text-red-300'
      }`}>
        {isAiConnected ? 'Gemini Live Active' : 'Connecting AI...'}
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-4 w-64">
        
        {/* Shape Selector */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-semibold uppercase">Shape</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(ShapeType).map((shape) => (
              <button
                key={shape}
                onClick={() => setShape(shape)}
                className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 border ${
                  currentShape === shape 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-gray-300 border-white/20 hover:bg-white/10'
                }`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
           <label className="text-xs text-gray-400 font-semibold uppercase">Particle Color</label>
           <div className="flex items-center gap-3">
             <input 
                type="color" 
                value={currentColor}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
             />
             <span className="text-sm font-mono text-gray-300">{currentColor}</span>
           </div>
        </div>

        {/* Fullscreen Button */}
        <button 
          onClick={onToggleFullscreen}
          className="mt-2 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-colors"
        >
          Toggle Fullscreen
        </button>

        <div className="text-[10px] text-gray-500 leading-tight">
          Show palms open to expand. Clench fists to shrink.
        </div>
      </div>
    </div>
  );
};

export default UIControls;
