'use client';

import React, { useState } from 'react';
import { PredicateParseResult, PredicateDiff } from '../lib/types';
import { categorizePredicate } from '../lib/predicateDiff';
import { Copy, Check, Plus, Minus, Eye, ShieldCheck, Activity } from 'lucide-react';

interface InspectorPanelProps {
  currentStep: number;
  totalSteps: number;
  actionName?: string;
  parsedPredicates: PredicateParseResult;
  diff: PredicateDiff;
  hoveredBlock: string | null;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  currentStep,
  totalSteps,
  actionName = 'initial_state',
  parsedPredicates,
  diff,
  hoveredBlock,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'table' | 'stack' | 'clear' | 'arm'>('all');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle copy predicates to clipboard
  const handleCopyPredicates = () => {
    navigator.clipboard.writeText(JSON.stringify(parsedPredicates.raw, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter raw active predicates
  const filteredPredicates = parsedPredicates.raw.filter((pred) => {
    const trimmed = pred.trim();
    if (!trimmed) return false;

    // Search filter
    if (searchTerm && !trimmed.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filterCategory === 'all') return true;
    const cat = categorizePredicate(trimmed);
    return cat === filterCategory;
  });

  // Check if a predicate involves the hovered block
  const predicateInvolvesBlock = (pred: string, block: string | null) => {
    if (!block) return false;
    // Look for (X), (X, Y), or (Y, X)
    const regex = new RegExp(`[\\(,]\\s*${block}\\s*[\\),]|${block}$`, 'i');
    return regex.test(pred);
  };

  // Format action description
  const getActionDescription = () => {
    const a = (actionName || '').trim();
    if (a === 'initial_state' || currentStep === 0) {
      return 'Initial environment state configuration';
    }

    const unstackMatch = a.match(/^unstack\(([^,]+),\s*([^)]+)\)$/i);
    if (unstackMatch) {
      return `Unstacked Block ${unstackMatch[1]} from top of Block ${unstackMatch[2]}`;
    }

    const stackMatch = a.match(/^stack\(([^,]+),\s*([^)]+)\)$/i);
    if (stackMatch) {
      return `Stacked Block ${stackMatch[1]} on top of Block ${stackMatch[2]}`;
    }

    const pickupMatch = a.match(/^pickup\(([^)]+)\)$/i);
    if (pickupMatch) {
      return `Picked up Block ${pickupMatch[1]} from the table`;
    }

    const putdownMatch = a.match(/^putdown\(([^)]+)\)$/i);
    if (putdownMatch) {
      return `Put down Block ${putdownMatch[1]} onto the table surface`;
    }

    return `Executed action: ${a}`;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. STEP SUMMARY & ACTION CARD */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md flex-shrink-0">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Action Inspector
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Step {currentStep} of {Math.max(0, totalSteps - 1)}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wide truncate">
              {actionName}
            </span>
            {parsedPredicates.holding ? (
              <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Holding [{parsedPredicates.holding}]
              </span>
            ) : (
              <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Arm Empty
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300/90 leading-relaxed truncate">
            {getActionDescription()}
          </p>
        </div>
      </div>

      {/* 2. PREDICATE DELTA / DIFF (Constant Fixed Height: 200px) */}
      <div className="h-[200px] rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              State Transitions (Diff)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {currentStep === 0 ? 'Initial step' : `Step ${currentStep - 1} → ${currentStep}`}
          </span>
        </div>

        {/* Constant Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-2.5 flex flex-col gap-2.5">
          {currentStep === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-slate-850/60 text-xs text-slate-400 italic text-center">
              Initial episode state configuration. Scrub forward to reveal predicate add/delete effects.
            </div>
          ) : (
            <>
              {/* Added Predicates (+) */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Plus className="w-3 h-3 text-emerald-400" />
                  Added Predicates ({diff.added.length})
                </span>
                {diff.added.length === 0 ? (
                  <span className="text-xs text-slate-500 italic pl-1">None added</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {diff.added.map((p) => (
                      <span
                        key={`added-${p}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 shadow-sm"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Removed Predicates (-) */}
              <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/40">
                <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                  <Minus className="w-3 h-3 text-rose-400" />
                  Removed Predicates ({diff.removed.length})
                </span>
                {diff.removed.length === 0 ? (
                  <span className="text-xs text-slate-500 italic pl-1">None removed</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {diff.removed.map((p) => (
                      <span
                        key={`removed-${p}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium bg-rose-950/60 border border-rose-500/50 text-rose-300 shadow-sm"
                      >
                        <Minus className="w-3 h-3 text-rose-400" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. ACTIVE PREDICATES LIST (Constant Fixed Height: 340px) */}
      <div className="h-[340px] rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Active Predicates ({parsedPredicates.raw.length})
            </span>
          </div>

          <button
            onClick={handleCopyPredicates}
            title="Copy predicates JSON to clipboard"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-1.5 pt-2.5 pb-1.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'stack', label: 'Stacking' },
              { id: 'table', label: 'Table' },
              { id: 'clear', label: 'Clear' },
              { id: 'arm', label: 'Arm' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                filterCategory === tab.id
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex-shrink-0 pb-2">
          <input
            type="text"
            placeholder="Filter predicates (e.g. on, B, clear)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Predicates Scroll List (Takes remaining space and scrolls smoothly) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
          {filteredPredicates.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 italic py-4 text-center">
              No matching predicates for this filter.
            </div>
          ) : (
            filteredPredicates.map((p, idx) => {
              const isHighlighted = predicateInvolvesBlock(p, hoveredBlock);
              return (
                <div
                  key={`pred-${idx}-${p}`}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                    isHighlighted
                      ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md scale-[1.01]'
                      : 'bg-slate-950/50 border-slate-800/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-medium">{p}</span>
                  {isHighlighted && (
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold">
                      Block {hoveredBlock}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
