import React from 'react';
import { Box, Sparkles, Camera, ArrowRight, Layers, Wand2 } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onTryDemo }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          FIBO Studio
        </div>
        <div className="flex gap-4">
          <button onClick={onTryDemo} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">
            Try Demo
          </button>
          <button onClick={onGetStarted} className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors">
            Sign In
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto mt-10 mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-indigo-400 mb-8">
            <Sparkles className="w-3 h-3" />
            <span>AI-Powered Virtual Photography</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-transparent">
          Your Product Studio, <br/> Reimagined in 3D.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          Create consistent, professional product imagery without a physical studio. 
          Use natural language to control lighting, swap objects, and generate high-fidelity 
          marketing assets in seconds.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button 
            onClick={onGetStarted}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25"
          >
            Start Creating <ArrowRight className="w-5 h-5" />
          </button>
          <button 
             onClick={onTryDemo}
             className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all"
          >
            Launch Test Drive
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full">
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <Wand2 className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Prompt-to-Studio</h3>
                <p className="text-sm text-zinc-400">Describe your desired mood ("Cinematic", "Soft") and watch the 3D lighting update instantly.</p>
            </div>
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <Layers className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Bulk Consistency</h3>
                <p className="text-sm text-zinc-400">Lock your camera and lighting settings to generate consistent assets for entire catalogs.</p>
            </div>
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <Camera className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">High-Fidelity Renders</h3>
                <p className="text-sm text-zinc-400">Generate 8K-ready marketing images using advanced AI that respects your 3D scene layout.</p>
            </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-zinc-900 py-8 text-center text-zinc-600 text-sm">
        © 2024 FIBO Studio. All rights reserved.
      </footer>
    </div>
  );
};