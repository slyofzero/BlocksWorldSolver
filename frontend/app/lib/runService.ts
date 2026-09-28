import fs from 'fs';
import path from 'path';
import { Episode, RunSummary, EpisodeListItem } from './types';

interface CachedRun {
  mtime: number;
  data: {
    traj_histories: Array<{
      initial_state: string[];
      steps: Array<{
        step: number;
        action: string;
        predicates: string[];
      }>;
      total_steps?: number;
      name?: string;
    }>;
    returns?: number[];
    success_rate?: number[];
    entropy?: number[];
    loss?: number[];
  };
}

const runCache = new Map<string, CachedRun>();

/**
 * Resolves the path to the internal data/runs directory inside frontend.
 */
export function getDataRunsDir(): string {
  // 1. Check relative to current working directory (frontend/data/runs)
  const candidate1 = path.resolve(process.cwd(), 'data/runs');
  if (fs.existsSync(candidate1)) return candidate1;

  // 2. Check if running from root directory (BlocksWorldSolver/frontend/data/runs)
  const candidate2 = path.resolve(process.cwd(), 'frontend/data/runs');
  if (fs.existsSync(candidate2)) return candidate2;

  // 3. Fallback absolute path
  const candidate3 = 'C:\\Users\\Ishan\\Personal\\Porfolio\\BlocksWorldSolver\\frontend\\data\\runs';
  if (!fs.existsSync(candidate3)) {
    try {
      fs.mkdirSync(candidate3, { recursive: true });
    } catch {
      // ignore
    }
  }
  return candidate3;
}



/**
 * Normalizes different Blocks World trajectory JSON schemas into a unified history format.
 */
function normalizeRunJson(parsed: any): CachedRun['data'] {
  // Schema A: diagnostics.json with traj_histories
  if (Array.isArray(parsed?.traj_histories)) {
    return {
      traj_histories: parsed.traj_histories,
      returns: parsed.returns || [],
      success_rate: parsed.success_rate || [],
      entropy: parsed.entropy || [],
      loss: parsed.loss || [],
    };
  }

  // Schema B: { episodes: [ ... ] } (like trajectories.json / prompt format)
  if (Array.isArray(parsed?.episodes)) {
    const returns: number[] = [];
    const histories = parsed.episodes.map((ep: any, idx: number) => {
      const traj = Array.isArray(ep.trajectory) ? ep.trajectory : [];
      const acts = Array.isArray(ep.actions) ? ep.actions : [];

      const initial_state = traj[0] || [];
      const steps = traj.slice(1).map((preds: string[], stepIdx: number) => ({
        step: stepIdx + 1,
        action: acts[stepIdx + 1] || 'step',
        predicates: preds || [],
      }));

      const ret = typeof ep.return === 'number' ? ep.return : (ep.success ? 1.0 : 0.0);
      returns.push(ret);

      return {
        initial_state,
        steps,
        total_steps: traj.length,
        name: ep.name || `Episode #${ep.episode_id ?? idx}`,
      };
    });

    return {
      traj_histories: histories,
      returns,
    };
  }

  // Schema C: Raw array of episodes or raw trajectory array
  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && Array.isArray(parsed[0])) {
      // Single raw trajectory [ [preds], [preds] ]
      return {
        traj_histories: [
          {
            initial_state: parsed[0] || [],
            steps: parsed.slice(1).map((preds, i) => ({
              step: i + 1,
              action: 'step',
              predicates: preds,
            })),
            total_steps: parsed.length,
            name: 'Uploaded Trajectory',
          },
        ],
        returns: [0],
      };
    }
  }

  return {
    traj_histories: [],
    returns: [],
  };
}

/**
 * Resolves the exact file path for a runId inside frontend/data/runs (or legacy dirs).
 */
export function resolveRunFilePath(runId: string): string | null {
  const dataDir = getDataRunsDir();

  // Check 1: direct file in data/runs
  const directPath = path.join(dataDir, runId);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  // Check 2: direct file with .json extension
  if (!runId.endsWith('.json')) {
    const withJson = path.join(dataDir, `${runId}.json`);
    if (fs.existsSync(withJson) && fs.statSync(withJson).isFile()) {
      return withJson;
    }
  }

  // Check 3: subfolder with diagnostics.json or same-name.json in data/runs
  const folderPath = path.join(dataDir, runId);
  if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
    const diag = path.join(folderPath, 'diagnostics.json');
    if (fs.existsSync(diag)) return diag;

    const files = fs.readdirSync(folderPath);
    const jsonFile = files.find((f) => f.endsWith('.json'));
    if (jsonFile) return path.join(folderPath, jsonFile);
  }

  return null;
}

/**
 * Loads and caches run data from file.
 */
export function loadRunData(runId: string): CachedRun['data'] | null {
  const filePath = resolveRunFilePath(runId);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const stat = fs.statSync(filePath);
  const cached = runCache.get(runId);

  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.data;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const normalized = normalizeRunJson(parsed);

    runCache.set(runId, {
      mtime: stat.mtimeMs,
      data: normalized,
    });

    return normalized;
  } catch (err) {
    console.error(`Failed to read/parse ${filePath}:`, err);
    return null;
  }
}

/**
 * Scans frontend/data/runs and lists all available model runs / JSON files.
 */
export function getAvailableRuns(): RunSummary[] {
  const dataDir = getDataRunsDir();
  const runs: RunSummary[] = [];
  const defaultRunId = getDefaultRunId();

  if (fs.existsSync(dataDir)) {
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.startsWith('.')) {
        const runId = entry.name;

        try {
          const runData = loadRunData(runId);
          const totalEpisodes = runData?.traj_histories?.length || 0;

          // Strictly require at least 1 valid trajectory episode
          if (!runData || !runData.traj_histories || totalEpisodes === 0) {
            continue;
          }

          const returns = runData.returns || [];
          let avgReturn: number | undefined = undefined;
          let maxReturn: number | undefined = undefined;

          if (returns.length > 0) {
            const sum = returns.reduce((a, b) => a + b, 0);
            avgReturn = Number((sum / returns.length).toFixed(2));
            maxReturn = Number(Math.max(...returns).toFixed(2));
          }

          runs.push({
            id: runId,
            name: runId,
            path: `frontend/data/runs/${runId}`,
            totalEpisodes,
            returnsAvailable: returns.length > 0,
            avgReturn,
            maxReturn,
            isDefault: Boolean(
              defaultRunId &&
                (defaultRunId === runId || defaultRunId === runId.replace(/\.json$/i, ''))
            ),
          });
        } catch {
          // Ignore invalid or unparseable JSON files
        }
      }
    }
  }

  return runs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Saves an uploaded JSON file stream into frontend/data/runs/ directory without holding the whole file in memory.
 */
export async function saveUploadedFileStream(
  originalFileName: string,
  stream: NodeJS.ReadableStream
): Promise<{ success: boolean; runId: string; totalEpisodes: number; message: string }> {
  const dataDir = getDataRunsDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Clean filename: remove illegal chars, preserve .json
  let sanitized = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitized.toLowerCase().endsWith('.json')) {
    sanitized += '.json';
  }

  const targetPath = path.join(dataDir, sanitized);
  const tempPath = path.join(dataDir, `${sanitized}.tmp-${Date.now()}`);

  // 1. Pipe stream directly to disk (fast streaming, minimal RAM usage)
  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempPath);
    stream.pipe(writeStream);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
    stream.on('error', reject);
  });

  // 2. Validate the saved file
  try {
    const text = fs.readFileSync(tempPath, 'utf8');
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(text);
    } catch (parseErr: any) {
      throw new Error(`Invalid JSON format: ${parseErr.message}`);
    }

    const normalized = normalizeRunJson(parsedJson);
    if (!normalized.traj_histories || normalized.traj_histories.length === 0) {
      if (Array.isArray(parsedJson?.returns) && parsedJson.returns.length > 0) {
        throw new Error(
          'This JSON file contains evaluation returns but is missing "traj_histories". Please ensure the RL evaluation script logged trajectory histories.'
        );
      }
      throw new Error(
        'JSON does not contain recognized Blocks World trajectory keys (expected "traj_histories", "episodes", or trajectory array).'
      );
    }

    // Atomically overwrite targetPath
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch {
        // ignore
      }
    }
    fs.renameSync(tempPath, targetPath);

    // Update runCache
    runCache.set(sanitized, {
      mtime: fs.statSync(targetPath).mtimeMs,
      data: normalized,
    });
    const withoutExt = sanitized.replace(/\.json$/i, '');
    runCache.set(withoutExt, {
      mtime: fs.statSync(targetPath).mtimeMs,
      data: normalized,
    });

    return {
      success: true,
      runId: sanitized,
      totalEpisodes: normalized.traj_histories.length,
      message: `Saved ${sanitized} with ${normalized.traj_histories.length} episodes under frontend/data/runs/`,
    };
  } catch (validationErr: any) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
    throw validationErr;
  }
}

/**
 * Saves an uploaded JSON file into frontend/data/runs/ directory.
 */
export function saveUploadedRun(
  originalFileName: string,
  content: string | Buffer
): { success: boolean; runId: string; totalEpisodes: number; message: string } {
  const dataDir = getDataRunsDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Clean filename: remove illegal chars, preserve .json
  let sanitized = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitized.toLowerCase().endsWith('.json')) {
    sanitized += '.json';
  }

  const targetPath = path.join(dataDir, sanitized);

  // Parse and validate before saving
  const text = typeof content === 'string' ? content : content.toString('utf8');
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Invalid JSON content: ${err.message}`);
  }

  const normalized = normalizeRunJson(parsedJson);
  if (!normalized.traj_histories || normalized.traj_histories.length === 0) {
    if (Array.isArray(parsedJson?.returns) && parsedJson.returns.length > 0) {
      throw new Error(
        'This JSON file contains evaluation returns but is missing "traj_histories". Please ensure the RL evaluation script logged trajectory histories.'
      );
    }
    throw new Error(
      'JSON does not contain recognized Blocks World trajectory keys (expected "traj_histories", "episodes", or trajectory array).'
    );
  }

  // Write file to data/runs/
  fs.writeFileSync(targetPath, text, 'utf8');

  // Clear cache for this runId
  runCache.set(sanitized, {
    mtime: fs.statSync(targetPath).mtimeMs,
    data: normalized,
  });
  const withoutExt = sanitized.replace(/\.json$/i, '');
  runCache.set(withoutExt, {
    mtime: fs.statSync(targetPath).mtimeMs,
    data: normalized,
  });

  return {
    success: true,
    runId: sanitized,
    totalEpisodes: normalized.traj_histories.length,
    message: `Saved ${sanitized} with ${normalized.traj_histories.length} episodes under frontend/data/runs/`,
  };
}

/**
 * Gets a paginated list of episode headers for a given run.
 */
export function getEpisodeList(
  runId: string,
  options: { page?: number; limit?: number; filter?: 'all' | 'positive' | 'negative' } = {}
): { total: number; episodes: EpisodeListItem[] } {
  const runData = loadRunData(runId);
  if (!runData || !runData.traj_histories) {
    return { total: 0, episodes: [] };
  }

  const histories = runData.traj_histories;
  const returns = runData.returns || [];

  let items: EpisodeListItem[] = histories.map((th, idx) => {
    const ret = returns[idx] !== undefined ? Number(returns[idx].toFixed(2)) : undefined;
    return {
      index: idx,
      episode_id: idx,
      total_steps: (th.steps?.length || 0) + 1,
      return: ret,
      isSuccess: ret !== undefined ? ret > 2.0 : false,
    };
  });

  if (options.filter === 'positive') {
    items = items.filter((item) => (item.return ?? -999) > 0);
  } else if (options.filter === 'negative') {
    items = items.filter((item) => (item.return ?? 0) <= 0);
  }

  const total = items.length;
  const page = options.page || 1;
  const limit = options.limit || 50;
  const start = (page - 1) * limit;
  const paginated = items.slice(start, start + limit);

  return { total, episodes: paginated };
}

/**
 * Retrieves a single episode from traj_histories and formats it into standard trajectory format.
 */
export function getEpisodeData(runId: string, episodeIndex: number): Episode | null {
  const runData = loadRunData(runId);
  if (!runData || !runData.traj_histories || runData.traj_histories.length === 0) {
    return null;
  }

  // Support 1-based 10000 lookup fallback (10000 -> 9999)
  let actualIndex = episodeIndex;
  if (!runData.traj_histories[actualIndex] && actualIndex === runData.traj_histories.length) {
    actualIndex = actualIndex - 1;
  }

  const rawEpisode = runData.traj_histories[actualIndex];
  if (!rawEpisode) {
    return null;
  }

  const trajectory: string[][] = [rawEpisode.initial_state || []];
  const actions: string[] = ['initial_state'];

  for (const s of rawEpisode.steps || []) {
    trajectory.push(s.predicates || []);
    actions.push(s.action || 'step');
  }

  const ret = runData.returns?.[actualIndex];

  return {
    episode_id: actualIndex,
    name:
      rawEpisode.name ||
      `${runId.replace(/\.json$/i, '')} — Epoch #${actualIndex + 1} ${
        ret !== undefined ? ` (Return: ${ret.toFixed(2)})` : ''
      }`,
    total_steps: trajectory.length,
    trajectory,
    actions,
    return: ret !== undefined ? Number(ret.toFixed(2)) : undefined,
    success: ret !== undefined ? ret > 2.0 : undefined,
  };
}

/**
 * Resolves path to configuration file (frontend/data/config.json).
 */
export function getConfigFilePath(): string {
  const dataDir = path.dirname(getDataRunsDir());
  return path.join(dataDir, 'config.json');
}

/**
 * Gets the configured default run ID, if any.
 */
export function getDefaultRunId(): string | null {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (typeof parsed?.defaultRunId === 'string' && parsed.defaultRunId.trim()) {
        const candidate = resolveRunFilePath(parsed.defaultRunId);
        if (candidate && fs.existsSync(candidate)) {
          return parsed.defaultRunId;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Sets or clears the configured default run ID.
 */
export function setDefaultRunId(runId: string | null): void {
  try {
    const configPath = getConfigFilePath();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    let currentConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch {
        currentConfig = {};
      }
    }
    currentConfig.defaultRunId = runId ? runId.trim() : null;
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to update config.json:', err);
  }
}

/**
 * Renames a save file in frontend/data/runs/.
 */
export function renameRun(
  oldRunId: string,
  newDisplayName: string
): { success: boolean; newRunId: string; message: string } {
  const dataDir = getDataRunsDir();
  const oldPath = resolveRunFilePath(oldRunId);
  if (!oldPath || !fs.existsSync(oldPath)) {
    throw new Error(`Save "${oldRunId}" not found in data/runs/`);
  }

  let sanitized = newDisplayName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!sanitized) {
    throw new Error('New name cannot be empty');
  }
  if (!sanitized.toLowerCase().endsWith('.json')) {
    sanitized += '.json';
  }

  const newPath = path.join(dataDir, sanitized);
  if (
    path.resolve(oldPath).toLowerCase() !== path.resolve(newPath).toLowerCase() &&
    fs.existsSync(newPath)
  ) {
    throw new Error(`A save named "${sanitized}" already exists.`);
  }

  // Check if this run was default BEFORE renaming on disk
  const currentDefault = getDefaultRunId();
  const wasDefault = Boolean(
    currentDefault &&
      (currentDefault === oldRunId ||
        currentDefault === oldRunId.replace(/\.json$/i, '') ||
        currentDefault === path.basename(oldPath))
  );

  fs.renameSync(oldPath, newPath);

  // Update default run ID if this run was default
  if (wasDefault) {
    setDefaultRunId(sanitized);
  }

  // Clear cache entries
  runCache.delete(oldRunId);
  runCache.delete(oldRunId.replace(/\.json$/i, ''));
  runCache.delete(path.basename(oldPath));
  runCache.delete(path.basename(oldPath, '.json'));

  return {
    success: true,
    newRunId: sanitized,
    message: `Renamed to ${sanitized}`,
  };
}

/**
 * Deletes a save file from frontend/data/runs/.
 */
export function deleteRun(runId: string): { success: boolean; message: string } {
  const oldPath = resolveRunFilePath(runId);
  if (!oldPath || !fs.existsSync(oldPath)) {
    throw new Error(`Save "${runId}" not found in data/runs/`);
  }

  // Check if this run was default BEFORE unlinking
  const currentDefault = getDefaultRunId();
  const wasDefault = Boolean(
    currentDefault &&
      (currentDefault === runId ||
        currentDefault === runId.replace(/\.json$/i, '') ||
        currentDefault === path.basename(oldPath))
  );

  fs.unlinkSync(oldPath);

  // If this run was default, clear default
  if (wasDefault) {
    setDefaultRunId(null);
  }

  // Clear cache entries
  runCache.delete(runId);
  runCache.delete(runId.replace(/\.json$/i, ''));
  runCache.delete(path.basename(oldPath));
  runCache.delete(path.basename(oldPath, '.json'));

  return {
    success: true,
    message: `Deleted ${path.basename(oldPath)}`,
  };
}

