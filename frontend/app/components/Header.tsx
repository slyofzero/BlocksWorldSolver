'use client';

import React, { useRef } from 'react';
import {
  Boxes,
  Upload,
  RotateCcw,
  HelpCircle,
  FolderGit2,
  ListFilter,
  Loader2,
} from 'lucide-react';
import { RunSummary } from '../lib/types';

interface HeaderProps {
  availableRuns: RunSummary[];
  selectedRunId: string;
  onSelectRun: (runId: string) => void;
  currentEpisodeId: number | string;
  totalEpisodesInRun: number;
  onFileUpload: (file: File) => void;
  onResetToTutorial: () => void;
  onOpenShortcuts: () => void;
  onOpenEpisodeBrowser: () => void;
  uploadedFileName: string | null;
  isUploading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  availableRuns,
  selectedRunId,
  onSelectRun,
  currentEpisodeId,
  totalEpisodesInRun,
  onFileUpload,
  onResetToTutorial,
  onOpenShortcuts,
  onOpenEpisodeBrowser,
  uploadedFileName,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  return (
    <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-950 border border-sky-400/30">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Blocks World RL Visualizer
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30">
                PPO / GRPO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              STRIPS Predicate Reconstruction & Trajectory Diagnostics
            </p>
          </div>
        </div>

        {/* Training Run & Episode Selector Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
          {/* Active Run Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs">
            <FolderGit2 className="w-4 h-4 text-sky-400" />
            <select
              value={selectedRunId}
              onChange={(e) => onSelectRun(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              <optgroup label="Stored Runs (frontend/data/runs/)">
                {availableRuns.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.name} ({r.totalEpisodes.toLocaleString()} eps)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tutorial & Demos">
                <option value="tutorial" className="bg-slate-900 text-white">
                  Prompt Tutorial: Stacking B onto C
                </option>
              </optgroup>
              {uploadedFileName && !availableRuns.some((r) => r.id === selectedRunId) && (
                <optgroup label="Memory Data">
                  <option value="custom" className="bg-slate-900 text-white">
                    {uploadedFileName} (Client Memory)
                  </option>
                </optgroup>
              )}
            </select>
          </div>

          {/* Episode Quick Selector / Browser */}
          {selectedRunId !== 'tutorial' && !selectedRunId.startsWith('custom') && (
            <button
              onClick={onOpenEpisodeBrowser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            >
              <ListFilter className="w-3.5 h-3.5 text-sky-400" />
              <span>Epoch #{currentEpisodeId}</span>
              <span className="text-slate-500">/ {totalEpisodesInRun.toLocaleString()}</span>
            </button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload JSON Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload a new model JSON (saved inside frontend/data/runs/ for standalone deployment)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600/90 hover:bg-sky-500 text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload JSON</span>
              </>
            )}
          </button>

          {/* Reset / Tutorial Demo Button */}
          <button
            onClick={onResetToTutorial}
            title="Reset to tutorial demo"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Shortcuts Help Button */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
