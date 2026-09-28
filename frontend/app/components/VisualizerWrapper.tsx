'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const VisualizerClient = dynamic(() => import('./VisualizerClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-sm tracking-wide text-slate-300 font-semibold">
          Loading Blocks World Visualizer...
        </span>
        <span className="text-xs text-slate-500">Initializing environment and policy trajectories</span>
      </div>
    </div>
  ),
});

export default function VisualizerWrapper() {
  return <VisualizerClient />;
}
