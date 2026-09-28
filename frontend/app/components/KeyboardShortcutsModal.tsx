'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '←', desc: 'Previous Step in trajectory' },
    { key: '→', desc: 'Next Step in trajectory' },
    { key: '[  or  PgUp', desc: 'Previous Epoch / Episode' },
    { key: ']  or  PgDn', desc: 'Next Epoch / Episode' },
    { key: 'Space', desc: 'Toggle Play / Pause auto playback' },
    { key: 'Home', desc: 'Jump to First Step (0)' },
    { key: 'End', desc: 'Jump to Last Step (T - 1)' },
    { key: 'L', desc: 'Toggle Loop Playback mode' },
    { key: 'Esc', desc: 'Close any open modal or dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Keyboard className="w-5 h-5 text-sky-400" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/40"
            >
              <span className="text-xs text-slate-300">{s.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-semibold text-sky-300 bg-slate-950 border border-slate-700 rounded-md shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-3 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
