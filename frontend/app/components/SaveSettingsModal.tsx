'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Star,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Loader2,
  FolderGit2,
  HardDrive,
} from 'lucide-react';
import { RunSummary } from '../lib/types';
import { renameBrowserRun, deleteBrowserRun } from '../lib/indexedDbService';

interface SaveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: RunSummary | null;
  allRuns: RunSummary[];
  onSelectRunToManage: (run: RunSummary) => void;
  onRunRenamed: (oldRunId: string, newRunId: string) => void;
  onRunDeleted: (runId: string) => void;
  onSetDefault: (runId: string | null) => void;
  defaultRunId: string | null;
}

const SaveSettingsModalContent: React.FC<
  Omit<SaveSettingsModalProps, 'isOpen'> & { run: RunSummary }
> = ({
  onClose,
  run,
  allRuns,
  onSelectRunToManage,
  onRunRenamed,
  onRunDeleted,
  onSetDefault,
  defaultRunId,
}) => {
  const [newName, setNewName] = useState(run.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isDefault = Boolean(
    defaultRunId &&
      (defaultRunId === run.id || defaultRunId === run.id.replace(/\.json$/i, ''))
  );
  const isIndexedDB = run.source === 'indexeddb' || run.id.startsWith('idb_');

  // 1. Rename handler (IndexedDB or Server)
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setActionError('File name cannot be empty.');
      return;
    }

    if (trimmed === run.name || `${trimmed}.json` === run.name) {
      setActionError('New name must be different from current name.');
      return;
    }

    setIsRenaming(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (isIndexedDB) {
        const updatedName = await renameBrowserRun(run.id, trimmed);
        setActionSuccess(`Successfully renamed to "${updatedName}".`);
        onRunRenamed(run.id, run.id);
      } else {
        const res = await fetch(`/api/runs/${encodeURIComponent(run.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName: trimmed }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to rename save file.');
        }

        setActionSuccess(`Successfully renamed to "${data.newRunId}".`);
        onRunRenamed(run.id, data.newRunId);
      }
    } catch (err: any) {
      setActionError(err.message || 'An error occurred while renaming.');
    } finally {
      setIsRenaming(false);
    }
  };

  // 2. Set / Unset Default handler
  const handleToggleDefault = async () => {
    setIsSettingDefault(true);
    setActionError(null);
    setActionSuccess(null);

    const targetDefault = isDefault ? null : run.id;

    try {
      if (!isIndexedDB) {
        await fetch('/api/runs/default', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultRunId: targetDefault }),
        }).catch(() => {});
      }

      onSetDefault(targetDefault);
      setActionSuccess(
        targetDefault
          ? `Set "${run.name}" as the default save.`
          : `Removed default save setting.`
      );
    } catch (err: any) {
      setActionError(err.message || 'An error occurred while updating default save.');
    } finally {
      setIsSettingDefault(false);
    }
  };

  // 3. Delete handler (IndexedDB or Server)
  const handleDelete = async () => {
    setIsDeleting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      if (isIndexedDB) {
        await deleteBrowserRun(run.id);
      } else {
        const res = await fetch(`/api/runs/${encodeURIComponent(run.id)}`, {
          method: 'DELETE',
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to delete save file.');
        }
      }

      onRunDeleted(run.id);
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'An error occurred while deleting.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Save Settings</span>
                {isDefault && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" /> Default
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Rename, set as default, or delete this trajectory save
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Selector Switcher (if multiple saves exist) */}
        {allRuns.length > 1 && (
          <div className="px-6 py-2.5 bg-slate-950/30 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
              Switch Save:
            </span>
            <div className="relative">
              <select
                value={run.id}
                onChange={(e) => {
                  const target = allRuns.find((r) => r.id === e.target.value);
                  if (target) onSelectRunToManage(target);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-500 pr-6 cursor-pointer"
              >
                {allRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isDefault ? '★' : ''} ({r.totalEpisodes.toLocaleString()} eps)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Notifications */}
          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* 1. Save Overview Card */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">File Identifier:</span>
              <span className="font-mono text-white font-semibold truncate max-w-[240px]">
                {run.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Storage Medium:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${
                  isIndexedDB
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                {isIndexedDB ? 'Browser Storage (IndexedDB)' : 'Server Storage (data/runs)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Total Epochs</div>
                <div className="text-sm font-bold text-sky-400">
                  {run.totalEpisodes.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Avg Return</div>
                <div className="text-sm font-bold text-slate-200">
                  {run.avgReturn !== undefined ? run.avgReturn : 'N/A'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-slate-400">Max Return</div>
                <div className="text-sm font-bold text-emerald-400">
                  {run.maxReturn !== undefined ? run.maxReturn : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Default Save Setting */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Star className={`w-4 h-4 ${isDefault ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                  <span>Default Save</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isDefault
                    ? 'This save is currently configured to load automatically on startup.'
                    : 'Set this trajectory to automatically load when opening the visualizer.'}
                </p>
              </div>

              <button
                onClick={handleToggleDefault}
                disabled={isSettingDefault}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDefault
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isSettingDefault ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-amber-300' : ''}`} />
                )}
                <span>{isDefault ? 'Remove Default' : 'Set as Default'}</span>
              </button>
            </div>
          </div>

          {/* 3. Rename Save Form */}
          <form onSubmit={handleRename} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
            <div>
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Rename Save</span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                {isIndexedDB
                  ? 'Updates display name in your browser storage'
                  : 'Changes the file name on server disk'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. baseline_ppo_run.json"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                type="submit"
                disabled={isRenaming || !newName.trim() || newName.trim() === run.name}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isRenaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Rename</span>
              </button>
            </div>
          </form>

          {/* 4. Delete Save (Danger Zone) */}
          <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Danger Zone</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isIndexedDB
                  ? 'Permanently delete this trajectory run from browser storage.'
                  : 'Permanently delete this trajectory file from disk. This cannot be undone.'}
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Delete Save...</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-700/60 space-y-2.5 animate-fadeIn">
                <div className="text-xs text-rose-200 font-medium">
                  Are you sure you want to delete <strong className="text-white font-mono">{run.name}</strong>?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SaveSettingsModal: React.FC<SaveSettingsModalProps> = (props) => {
  if (!props.isOpen || !props.run) return null;
  return (
    <SaveSettingsModalContent
      key={`${props.run.id}-${props.isOpen}`}
      {...props}
      run={props.run}
    />
  );
};
