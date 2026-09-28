export interface PredicateParseResult {
  onTable: string[];
  on: Record<string, string>; // child -> parent
  onReverse: Record<string, string>; // parent -> child
  clear: string[];
  holding: string | null;
  armempty: boolean;
  allBlocks: string[];
  raw: string[];
}

export interface BlockPosition {
  id: string;
  column: number;
  row: number; // 0 = table base, 1 = first on top, etc.
  isHeld: boolean;
  isTable: boolean;
  isClear: boolean;
  supportedBy: string | null;
  color: string;
  colorAccent: string;
}

export interface GripperState {
  isHolding: boolean;
  heldBlock: string | null;
  targetColumn: number;
}

export interface LayoutState {
  blocks: BlockPosition[];
  columnsCount: number;
  maxRow: number;
  gripper: GripperState;
  columnLabels: { column: number; baseBlock: string | null }[];
}

export interface PredicateDiff {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface Episode {
  episode_id: number | string;
  name?: string;
  total_steps: number;
  trajectory: string[][];
  actions?: string[];
  return?: number;
  success?: boolean;
}

export interface RunSummary {
  id: string;
  name: string;
  path: string;
  totalEpisodes: number;
  returnsAvailable: boolean;
  avgReturn?: number;
  maxReturn?: number;
  successRate?: number;
  isDefault?: boolean;
  source?: 'server' | 'indexeddb';
}

export interface EpisodeListItem {
  index: number;
  episode_id: number;
  total_steps: number;
  return?: number;
  isSuccess?: boolean;
}
