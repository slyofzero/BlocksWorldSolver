'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, Box, CheckCircle2 } from 'lucide-react';

interface TimelineScrubberProps {
  currentStep: number;
  totalSteps: number;
  actions: string[];
  onSelectStep: (step: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentStep,
  totalSteps,
  actions,
  onSelectStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll timeline to keep current step centered
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-step="${currentStep}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentStep]);

  const getActionIcon = (action: string) => {
    const a = (action || '').toLowerCase();
    if (a.startsWith('pickup')) return <ArrowUpRight className="w-3 h-3 text-amber-400" />;
    if (a.startsWith('unstack')) return <Box className="w-3 h-3 text-purple-400" />;
    if (a.startsWith('stack')) return <Layers className="w-3 h-3 text-sky-400" />;
    if (a.startsWith('putdown')) return <ArrowDownRight className="w-3 h-3 text-emerald-400" />;
    if (a === 'goal' || a.includes('goal')) return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />;
  };

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-2">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
          Trajectory Timeline ({totalSteps} steps)
        </span>
        <span className="text-[11px] text-slate-500">Click any step to jump</span>
      </div>

      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 custom-scrollbar scroll-smooth"
      >
        {Array.from({ length: totalSteps }).map((_, stepIdx) => {
          const action = actions[stepIdx] || (stepIdx === 0 ? 'start' : `step ${stepIdx}`);
          const isActive = stepIdx === currentStep;

          return (
            <button
              key={`timeline-step-${stepIdx}`}
              data-step={stepIdx}
              onClick={() => onSelectStep(stepIdx)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                isActive
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-950 scale-105'
                  : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="font-bold">{stepIdx}</span>
              {getActionIcon(action)}
              <span className="truncate max-w-[120px] text-[11px]">{action}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
