'use client';

import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Gauge,
  ListFilter,
} from 'lucide-react';

interface ControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: number;
  isLooping: boolean;
  actionName?: string;
  actionType?: string;
  onStepChange: (step: number) => void;
  onTogglePlay: () => void;
  onPrevEpoch?: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onNextEpoch?: () => void;
  canPrevEpoch?: boolean;
  canNextEpoch?: boolean;
  currentEpochNumber?: number;
  totalEpochs?: number;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
  onOpenEpisodeBrowser?: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  currentStep,
  totalSteps,
  isPlaying,
  playbackSpeed,
  isLooping,
  actionName = 'initial_state',
  actionType = 'initial',
  onStepChange,
  onTogglePlay,
  onPrevEpoch,
  onPrevStep,
  onNextStep,
  onNextEpoch,
  canPrevEpoch = false,
  canNextEpoch = false,
  currentEpochNumber,
  totalEpochs,
  onSpeedChange,
  onToggleLoop,
  onOpenEpisodeBrowser,
}) => {
  const maxStep = Math.max(0, totalSteps - 1);
  const progressPercent = maxStep > 0 ? (currentStep / maxStep) * 100 : 0;

  // Format action badge style
  const getActionBadgeColor = () => {
    switch (actionType) {
      case 'pickup':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'unstack':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'stack':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'putdown':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'initial':
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
      {/* Top scrubber bar with Action Pill & Step Numbers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-sm">
            <span className="text-slate-400">Step:</span>
            <span className="text-white font-bold text-base px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              {currentStep}
            </span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{maxStep}</span>
          </div>

          {/* Action indicator pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${getActionBadgeColor()} shadow-sm`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-80" />
            <span>Action: {actionName}</span>
          </div>
        </div>

        {/* Episode browser quick trigger if provided */}
        {onOpenEpisodeBrowser && (
          <button
            onClick={onOpenEpisodeBrowser}
            className="self-start sm:self-auto flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 px-3 py-1.5 rounded-lg bg-sky-950/40 border border-sky-800/50 hover:bg-sky-900/40 transition-colors"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>
              Epoch {currentEpochNumber ?? 1} of {totalEpochs ?? 10000}
            </span>
          </button>
        )}
      </div>

      {/* Trajectory Step Slider */}
      <div className="relative flex flex-col gap-1.5">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={maxStep}
            value={currentStep}
            onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
            className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            style={{
              background: `linear-gradient(to right, #0284c7 0%, #38bdf8 ${progressPercent}%, #1e293b ${progressPercent}%, #1e293b 100%)`,
            }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-500 px-1">
          <span>0 (Start)</span>
          <span>{Math.round(progressPercent)}% completed</span>
          <span>{maxStep} (End)</span>
        </div>
      </div>

      {/* Playback Controls & Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        {/* Main Navigation & Playback Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Previous Epoch */}
          <button
            onClick={onPrevEpoch}
            disabled={Boolean(!canPrevEpoch)}
            suppressHydrationWarning
            title={
              canPrevEpoch
                ? `Previous Epoch (Epoch ${currentEpochNumber ? currentEpochNumber - 1 : ''})`
                : 'At First Epoch'
            }
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition-colors border border-slate-700/50 shadow-sm"
          >
            <SkipBack className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Prev Epoch</span>
          </button>

          {/* Prev Step */}
          <button
            onClick={onPrevStep}
            disabled={Boolean(currentStep === 0)}
            suppressHydrationWarning
            title="Previous Step (ArrowLeft)"
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition-colors border border-slate-700/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={onTogglePlay}
            title="Play / Pause (Space)"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Next Step */}
          <button
            onClick={onNextStep}
            disabled={Boolean(currentStep >= maxStep)}
            suppressHydrationWarning
            title="Next Step (ArrowRight)"
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition-colors border border-slate-700/50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Next Epoch */}
          <button
            onClick={onNextEpoch}
            disabled={Boolean(!canNextEpoch)}
            suppressHydrationWarning
            title={
              canNextEpoch
                ? `Next Epoch (Epoch ${currentEpochNumber ? currentEpochNumber + 1 : ''})`
                : 'At Last Epoch'
            }
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-30 disabled:hover:bg-slate-800/80 transition-colors border border-slate-700/50 shadow-sm"
          >
            <span className="hidden md:inline">Next Epoch</span>
            <SkipForward className="w-4 h-4 text-sky-400" />
          </button>
        </div>

        {/* Speed & Loop Controls */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/50 text-slate-300">
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
            >
              <option value="0.25" className="bg-slate-900 text-white">0.25x (2s)</option>
              <option value="0.5" className="bg-slate-900 text-white">0.5x (1s)</option>
              <option value="1" className="bg-slate-900 text-white">1x (500ms)</option>
              <option value="1.5" className="bg-slate-900 text-white">1.5x (330ms)</option>
              <option value="2" className="bg-slate-900 text-white">2x (250ms)</option>
              <option value="4" className="bg-slate-900 text-white">4x (125ms)</option>
            </select>
          </div>

          {/* Loop toggle */}
          <button
            onClick={onToggleLoop}
            title="Loop playback"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-colors ${
              isLooping
                ? 'bg-sky-950/60 border-sky-500/50 text-sky-400'
                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
