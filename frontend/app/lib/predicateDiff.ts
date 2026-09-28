import { PredicateDiff } from './types';

export function calculatePredicateDiff(
  prevPredicates: string[] | null,
  currentPredicates: string[]
): PredicateDiff {
  if (!prevPredicates) {
    return {
      added: [...currentPredicates],
      removed: [],
      unchanged: [],
    };
  }

  const prevSet = new Set(prevPredicates.map((p) => p.trim()));
  const currSet = new Set(currentPredicates.map((p) => p.trim()));

  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  for (const p of currSet) {
    if (prevSet.has(p)) {
      unchanged.push(p);
    } else {
      added.push(p);
    }
  }

  for (const p of prevSet) {
    if (!currSet.has(p)) {
      removed.push(p);
    }
  }

  added.sort();
  removed.sort();
  unchanged.sort();

  return { added, removed, unchanged };
}

export function categorizePredicate(pred: string): 'table' | 'stack' | 'clear' | 'arm' | 'other' {
  const p = pred.trim().toLowerCase();
  if (p.startsWith('ontable(')) return 'table';
  if (p.startsWith('on(')) return 'stack';
  if (p.startsWith('clear(')) return 'clear';
  if (p.startsWith('holding(') || p === 'armempty') return 'arm';
  return 'other';
}
