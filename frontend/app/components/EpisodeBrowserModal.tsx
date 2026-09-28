'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { EpisodeListItem } from '../lib/types';

interface EpisodeBrowserModalProps {
  isOpen: boolean;
  runId: string;
  currentEpisodeId: number | string;
  totalEpisodesInRun?: number;
  onClose: () => void;
  onSelectEpisode: (episodeId: number) => void;
}

export const EpisodeBrowserModal: React.FC<EpisodeBrowserModalProps> = ({
  isOpen,
  runId,
  currentEpisodeId,
  totalEpisodesInRun,
  onClose,
  onSelectEpisode,
}) => {
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>([]);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !runId || runId.startsWith('tutorial') || runId.startsWith('custom')) {
      return;
    }

    const fetchEpisodes = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/runs/${runId}/episodes?page=${page}&limit=40&filter=${filter}`
        );
        if (res.ok) {
          const data = await res.json();
          setEpisodes(data.episodes || []);
          setTotalEpisodes(data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load episodes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [isOpen, runId, page, filter]);

  if (!isOpen) return null;

  // Jump to specific episode by number (1st -> 0, 10000th -> 9999)
  const handleDirectJump = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseInt(searchQuery.trim(), 10);
    if (!isNaN(rawNum)) {
      // If user enters 1 -> index 0; if 10000 -> index 9999; if 0 -> index 0
      const targetIndex = rawNum <= 1 ? 0 : rawNum - 1;
      onSelectEpisode(targetIndex);
      onClose();
    }
  };

  const maxEpisodes = totalEpisodesInRun || totalEpisodes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Browse Epochs / Episodes ({runId})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select or jump to any recorded trajectory{maxEpisodes > 0 ? ` (1 to ${maxEpisodes.toLocaleString()})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Quick jump to Episode ID */}
          <form onSubmit={handleDirectJump} className="w-full sm:w-auto flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                placeholder={maxEpisodes > 0 ? `Jump to Epoch # (1 - ${maxEpisodes.toLocaleString()})...` : "Jump to Epoch #..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors"
            >
              Jump
            </button>
          </form>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'positive', label: '★ High Reward' },
                { id: 'negative', label: 'Negative / Fail' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Episodes Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs">Loading episodes from diagnostics.json...</span>
            </div>
          ) : episodes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No episodes found for the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {episodes.map((ep) => {
                const isSelected = String(ep.episode_id) === String(currentEpisodeId);
                const hasReturn = ep.return !== undefined;
                const isSuccess = ep.isSuccess;

                return (
                  <button
                    key={`modal-ep-${ep.episode_id}`}
                    onClick={() => {
                      onSelectEpisode(ep.episode_id);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">
                          Epoch #{ep.episode_id + 1}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          (Ep {ep.episode_id})
                        </span>
                        {isSuccess && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Success
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Steps: <span className="text-slate-200">{ep.total_steps}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {hasReturn && (
                        <div
                          className={`font-mono text-xs font-bold ${
                            (ep.return ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          Return: {ep.return}
                        </div>
                      )}
                      <div className="text-[11px] text-sky-400 flex items-center gap-0.5 justify-end mt-1">
                        <span>Load</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer / Pagination */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {episodes.length} of {totalEpisodes} episodes
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              Previous
            </button>
            <span className="font-mono text-slate-300">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={episodes.length < 40}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
