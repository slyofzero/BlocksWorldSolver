import { PredicateParseResult } from './types';

// Deterministic vibrant colors for block identifiers
const PALETTE: Record<string, { bg: string; accent: string }> = {
  A: { bg: '#ef4444', accent: '#fca5a5' }, // Crimson Red
  B: { bg: '#3b82f6', accent: '#93c5fd' }, // Blue
  C: { bg: '#10b981', accent: '#6ee7b7' }, // Emerald
  D: { bg: '#f59e0b', accent: '#fcd34d' }, // Amber
  E: { bg: '#8b5cf6', accent: '#c4b5fd' }, // Purple
  F: { bg: '#06b6d4', accent: '#67e8f9' }, // Cyan
  G: { bg: '#ec4899', accent: '#f472b6' }, // Pink
  H: { bg: '#f97316', accent: '#fdba74' }, // Orange
  I: { bg: '#6366f1', accent: '#a5b4fc' }, // Indigo
  J: { bg: '#14b8a6', accent: '#5eead4' }, // Teal
};

export function getBlockColor(blockId: string): { bg: string; accent: string } {
  const upper = blockId.toUpperCase();
  if (PALETTE[upper]) {
    return PALETTE[upper];
  }

  // Hash-based deterministic color for custom block names
  let hash = 0;
  for (let i = 0; i < blockId.length; i++) {
    hash = blockId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 70%, 48%)`,
    accent: `hsl(${hue}, 85%, 72%)`,
  };
}

/**
 * Parses raw predicate strings at a timestep into structured STRIPS state.
 */
export function parsePredicates(predicates: string[]): PredicateParseResult {
  const result: PredicateParseResult = {
    onTable: [],
    on: {},
    onReverse: {},
    clear: [],
    holding: null,
    armempty: false,
    allBlocks: [],
    raw: predicates || [],
  };

  const blockSet = new Set<string>();

  for (const pred of predicates || []) {
    const trimmed = (pred || '').trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase() === 'armempty') {
      result.armempty = true;
      continue;
    }

    const matchOnTable = trimmed.match(/^onTable\(([^)]+)\)$/i);
    if (matchOnTable) {
      const b = matchOnTable[1].trim();
      result.onTable.push(b);
      blockSet.add(b);
      continue;
    }

    const matchOn = trimmed.match(/^on\(([^,]+),\s*([^)]+)\)$/i);
    if (matchOn) {
      const child = matchOn[1].trim();
      const parent = matchOn[2].trim();
      result.on[child] = parent;
      result.onReverse[parent] = child;
      blockSet.add(child);
      blockSet.add(parent);
      continue;
    }

    const matchClear = trimmed.match(/^clear\(([^)]+)\)$/i);
    if (matchClear) {
      const b = matchClear[1].trim();
      result.clear.push(b);
      blockSet.add(b);
      continue;
    }

    const matchHolding = trimmed.match(/^holding\(([^)]+)\)$/i);
    if (matchHolding) {
      const b = matchHolding[1].trim();
      result.holding = b;
      blockSet.add(b);
      continue;
    }
  }

  // Consistent block ordering
  result.allBlocks = Array.from(blockSet).sort((a, b) => a.localeCompare(b));
  result.onTable.sort((a, b) => a.localeCompare(b));

  return result;
}

/**
 * Automatically infer the STRIPS action between timestep t-1 and t if not provided.
 */
export function inferAction(
  prevPreds: PredicateParseResult | null,
  currPreds: PredicateParseResult
): { name: string; type: 'pickup' | 'putdown' | 'stack' | 'unstack' | 'noop' | 'initial' } {
  if (!prevPreds) {
    return { name: 'initial_state', type: 'initial' };
  }

  // Case 1: Picked up or unstacked something into gripper
  if (currPreds.holding && !prevPreds.holding) {
    const held = currPreds.holding;
    // Was it on the table previously?
    if (prevPreds.onTable.includes(held)) {
      return { name: `pickup(${held})`, type: 'pickup' };
    }
    // Was it on top of another block previously?
    if (prevPreds.on[held]) {
      return { name: `unstack(${held}, ${prevPreds.on[held]})`, type: 'unstack' };
    }
    return { name: `pickup(${held})`, type: 'pickup' };
  }

  // Case 2: Released held block
  if (prevPreds.holding && !currPreds.holding) {
    const released = prevPreds.holding;
    // Is it now on the table?
    if (currPreds.onTable.includes(released)) {
      return { name: `putdown(${released})`, type: 'putdown' };
    }
    // Is it now on top of another block?
    if (currPreds.on[released]) {
      return { name: `stack(${released}, ${currPreds.on[released]})`, type: 'stack' };
    }
    return { name: `putdown(${released})`, type: 'putdown' };
  }

  return { name: 'noop', type: 'noop' };
}
