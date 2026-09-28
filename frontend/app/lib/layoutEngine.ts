import { PredicateParseResult, BlockPosition, LayoutState, GripperState } from './types';
import { getBlockColor } from './predicateParser';

export interface LayoutOptions {
  columnMode?: 'stable' | 'compact';
  allEpisodeBlocks?: string[];
  allEpisodeTableBases?: string[];
  previousLayout?: LayoutState | null;
}

/**
 * Builds the visual 2D layout for a single timestep given its parsed predicates.
 */
export function computeLayout(
  parsed: PredicateParseResult,
  options: LayoutOptions = {}
): LayoutState {
  const {
    columnMode = 'stable',
    allEpisodeTableBases = [],
    previousLayout = null,
  } = options;

  const blocks: BlockPosition[] = [];
  const assignedBlockIds = new Set<string>();

  // 1. Identify Table Blocks (Bases of Stacks)
  // In addition to explicit onTable(X), find blocks that have nothing beneath them and are not held
  const explicitTableBlocks = [...parsed.onTable];
  const tableBases = [...explicitTableBlocks];

  // Also check if any block has no parent in parsed.on and is not held, but not in onTable
  for (const b of parsed.allBlocks) {
    if (
      !tableBases.includes(b) &&
      !parsed.on[b] &&
      parsed.holding !== b
    ) {
      tableBases.push(b);
    }
  }

  // 2. Assign column indices to table base blocks
  const columnAssignment = new Map<string, number>();

  if (columnMode === 'stable' && allEpisodeTableBases.length > 0) {
    // Map each base to its pre-established persistent column
    const sortedAllBases = Array.from(new Set(allEpisodeTableBases)).sort((a, b) =>
      a.localeCompare(b)
    );
    sortedAllBases.forEach((base, idx) => {
      columnAssignment.set(base, idx);
    });

    // If there's an unexpected base not in the pre-scanned list, assign next available column
    let nextCol = sortedAllBases.length;
    for (const base of tableBases) {
      if (!columnAssignment.has(base)) {
        columnAssignment.set(base, nextCol++);
      }
    }
  } else {
    // Compact mode: sort active table bases alphabetically and assign 0, 1, 2, ...
    tableBases.sort((a, b) => a.localeCompare(b));
    tableBases.forEach((base, idx) => {
      columnAssignment.set(base, idx);
    });
  }

  // Determine total columns count
  let maxColIndex = 0;
  for (const col of columnAssignment.values()) {
    if (col > maxColIndex) maxColIndex = col;
  }
  const columnsCount = Math.max(3, maxColIndex + 1);

  // 3. Build Stacks Upward from Table Bases
  let maxRow = 0;
  const columnLabels: { column: number; baseBlock: string | null }[] = [];

  for (let c = 0; c < columnsCount; c++) {
    columnLabels.push({ column: c, baseBlock: null });
  }

  for (const base of tableBases) {
    const col = columnAssignment.get(base) ?? 0;
    columnLabels[col] = { column: col, baseBlock: base };

    // Place the base block at row 0
    let currBlock: string | null = base;
    let currRow = 0;
    const visitedInStack = new Set<string>();

    while (currBlock && !visitedInStack.has(currBlock)) {
      visitedInStack.add(currBlock);
      assignedBlockIds.add(currBlock);

      const colorInfo = getBlockColor(currBlock);
      const isClear = parsed.clear.includes(currBlock) || !parsed.onReverse[currBlock];

      blocks.push({
        id: currBlock,
        column: col,
        row: currRow,
        isHeld: false,
        isTable: currRow === 0,
        isClear,
        supportedBy: currRow === 0 ? null : (parsed.on[currBlock] || null),
        color: colorInfo.bg,
        colorAccent: colorInfo.accent,
      });

      if (currRow > maxRow) maxRow = currRow;

      // Find block on top of currBlock
      const child: string | undefined = parsed.onReverse[currBlock];
      if (child && child !== parsed.holding) {
        currBlock = child;
        currRow++;
      } else {
        currBlock = null;
      }
    }
  }

  // 4. Handle Gripper / Arm State
  let gripperCol = Math.floor(columnsCount / 2);

  if (parsed.holding) {
    const heldBlock = parsed.holding;
    assignedBlockIds.add(heldBlock);

    // Determine which column the gripper is hovering above
    // Try to use previous column of this block if available
    let targetCol = Math.floor(columnsCount / 2);
    if (previousLayout) {
      const prevBlock = previousLayout.blocks.find((b) => b.id === heldBlock);
      if (prevBlock) {
        targetCol = prevBlock.column;
      } else {
        targetCol = previousLayout.gripper.targetColumn;
      }
    }

    gripperCol = targetCol;
    const colorInfo = getBlockColor(heldBlock);

    blocks.push({
      id: heldBlock,
      column: gripperCol,
      row: -1, // -1 denotes elevated held block
      isHeld: true,
      isTable: false,
      isClear: true,
      supportedBy: null,
      color: colorInfo.bg,
      colorAccent: colorInfo.accent,
    });
  } else if (previousLayout) {
    // If arm is empty, keep arm hovering over previous active column or center
    gripperCol = previousLayout.gripper.targetColumn;
  }

  // Clamp gripper column to valid range
  gripperCol = Math.max(0, Math.min(columnsCount - 1, gripperCol));

  const gripper: GripperState = {
    isHolding: Boolean(parsed.holding),
    heldBlock: parsed.holding,
    targetColumn: gripperCol,
  };

  // 5. Fallback for any unassigned blocks (e.g., malformed predicates)
  for (const b of parsed.allBlocks) {
    if (!assignedBlockIds.has(b)) {
      const col = columnsCount;
      const colorInfo = getBlockColor(b);
      blocks.push({
        id: b,
        column: col,
        row: 0,
        isHeld: false,
        isTable: true,
        isClear: true,
        supportedBy: null,
        color: colorInfo.bg,
        colorAccent: colorInfo.accent,
      });
    }
  }

  return {
    blocks,
    columnsCount,
    maxRow,
    gripper,
    columnLabels,
  };
}

/**
 * Pre-scans an entire trajectory to extract all blocks that ever sit on the table.
 * Used to establish permanent stable columns across the episode.
 */
export function extractTrajectoryTableBases(trajectory: string[][]): string[] {
  const tableBases = new Set<string>();

  for (const preds of trajectory) {
    for (const p of preds) {
      const match = p.match(/^onTable\(([^)]+)\)$/i);
      if (match) {
        tableBases.add(match[1].trim());
      }
    }
  }

  return Array.from(tableBases).sort((a, b) => a.localeCompare(b));
}
