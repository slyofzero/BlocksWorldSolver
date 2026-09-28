'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Boxes,
  Upload,
  RotateCcw,
  HelpCircle,
  FolderGit2,
  ListFilter,
  Loader2,
  ChevronDown,
  Settings,
  Star,
  Check,
  FileCode,
  Sparkles,
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
  onOpenSaveSettings: (run: RunSummary) => void;
  uploadedFileName: string | null;
  defaultRunId: string | null;
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
  onOpenSaveSettings,
  uploadedFileName,
  defaultRunId,
  isUploading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  const selectedRun = availableRuns.find((r) => r.id === selectedRunId);
  const isSelectedDefault = Boolean(
    selectedRun &&
      defaultRunId &&
      (defaultRunId === selectedRun.id || defaultRunId === selectedRun.id.replace(/\.json$/i, ''))
  );

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
          {/* Custom Interactive Run Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-white font-medium hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer max-w-[260px] sm:max-w-[320px]"
              >
                <FolderGit2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">
                  {selectedRunId === 'tutorial'
                    ? 'Tutorial: Stacking B onto C'
                    : selectedRunId === 'custom'
                    ? `${uploadedFileName || 'Uploaded'} (Memory)`
                    : selectedRun
                    ? selectedRun.name
                    : availableRuns.length === 0
                    ? 'No runs in data/runs/'
                    : '-- Select a Run --'}
                </span>

                {isSelectedDefault && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-300" /> Default
                  </span>
                )}

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                    isDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {/* Quick Settings Icon for Currently Active Run */}
              {selectedRun && (
                <button
                  type="button"
                  onClick={() => onOpenSaveSettings(selectedRun)}
                  title={`Manage settings for "${selectedRun.name}" (Rename, Delete, Default)`}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border-l border-slate-800"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Menu Panel */}
            {isDropdownOpen && (
              <div className="absolute right-0 sm:left-0 mt-1.5 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 p-2 text-xs space-y-2 animate-fadeIn">
                {/* Header */}
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span>Saved Trajectories</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {availableRuns.length} total
                  </span>
                </div>

                {/* Stored Runs List */}
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {availableRuns.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      <p>No saved trajectories yet.</p>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="mt-2 text-sky-400 hover:text-sky-300 underline font-medium"
                      >
                        Upload a trajectory JSON
                      </button>
                    </div>
                  ) : (
                    availableRuns.map((r) => {
                      const isItemDefault = Boolean(
                        defaultRunId &&
                          (defaultRunId === r.id || defaultRunId === r.id.replace(/\.json$/i, ''))
                      );
                      const isItemSelected = r.id === selectedRunId;
                      const isLocal = r.source === 'indexeddb' || r.id.startsWith('idb_');

                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-xl transition-colors group ${
                            isItemSelected
                              ? 'bg-sky-950/60 border border-sky-800/60 text-white'
                              : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                          }`}
                        >
                          {/* Selection Button */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectRun(r.id);
                              setIsDropdownOpen(false);
                            }}
                            className="flex-1 flex items-center gap-2 text-left cursor-pointer min-w-0"
                          >
                            <FileCode
                              className={`w-4 h-4 shrink-0 ${
                                isItemSelected ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold truncate">{r.name}</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-medium shrink-0 border ${
                                    isLocal
                                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                      : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                                  }`}
                                >
                                  {isLocal ? 'Local' : 'Server'}
                                </span>
                                {isItemDefault && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-300" /> Default
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {r.totalEpisodes.toLocaleString()} eps
                                {r.avgReturn !== undefined && ` • Avg: ${r.avgReturn}`}
                              </div>
                            </div>
                            {isItemSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                          </button>

                          {/* Settings button beside every save in the dropdown */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDropdownOpen(false);
                              onOpenSaveSettings(r);
                            }}
                            title={`Options for ${r.name} (Rename, Delete, Set Default)`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors shrink-0"
                          >
                            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-200 hover:rotate-45 transition-transform" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Tutorial & Memory Section */}
                <div className="border-t border-slate-800 pt-2 space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tutorials & Memory
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRun('tutorial');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left ${
                      selectedRunId === 'tutorial'
                        ? 'bg-sky-950/60 border border-sky-800/60 text-white'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">Prompt Tutorial: Stacking B onto C</span>
                    </div>
                    {selectedRunId === 'tutorial' && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </button>

                  {uploadedFileName && !availableRuns.some((r) => r.id === selectedRunId) && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectRun('custom');
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left ${
                        selectedRunId === 'custom'
                          ? 'bg-sky-950/60 border border-sky-800/60 text-white'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate">{uploadedFileName} (Client Memory)</span>
                      </div>
                      {selectedRunId === 'custom' && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                    </button>
                  )}
                </div>

                {/* Upload Action in Dropdown */}
                <div className="border-t border-slate-800 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-sky-400 font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload New Trajectory JSON</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Episode Quick Selector / Browser */}
          {selectedRunId && selectedRunId !== 'tutorial' && !selectedRunId.startsWith('custom') && (
            <button
              onClick={onOpenEpisodeBrowser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600/90 hover:bg-sky-500 text-white shadow-sm disabled:opacity-50 transition-colors cursor-pointer"
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
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Shortcuts Help Button */}
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts (?)"
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
