import { Episode, EpisodeListItem, RunSummary } from './types';

const DB_NAME = 'BlocksWorldRL_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export interface StoredRunRecord {
  id: string;
  name: string;
  totalEpisodes: number;
  returns: number[];
  avgReturn?: number;
  maxReturn?: number;
  createdAt: number;
}

interface StoredEpisodeRecord {
  runId: string;
  episodeIndex: number;
  episode: Episode;
}

/**
 * Initializes and caches the IndexedDB connection.
 */
export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is only available in the browser'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('runs')) {
        db.createObjectStore('runs', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('episodes')) {
        const episodeStore = db.createObjectStore('episodes', {
          keyPath: ['runId', 'episodeIndex'],
        });
        episodeStore.createIndex('by_runId', 'runId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

/**
 * Normalizes user-uploaded JSON into Blocks World standard trajectories.
 */
function normalizeClientJson(parsed: any): {
  histories: any[];
  returns: number[];
} {
  // Format A: { traj_histories: [ ... ], returns: [ ... ] }
  if (Array.isArray(parsed?.traj_histories)) {
    return {
      histories: parsed.traj_histories,
      returns: Array.isArray(parsed.returns) ? parsed.returns : [],
    };
  }

  // Format B: { episodes: [ ... ] }
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

      const ret = typeof ep.return === 'number' ? ep.return : ep.success ? 1.0 : 0.0;
      returns.push(ret);

      return {
        initial_state,
        steps,
        total_steps: traj.length,
        name: ep.name || `Episode #${ep.episode_id ?? idx}`,
      };
    });

    return { histories, returns };
  }

  // Format C: Raw trajectory array
  if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
    return {
      histories: [
        {
          initial_state: parsed[0] || [],
          steps: parsed.slice(1).map((preds: string[], stepIdx: number) => ({
            step: stepIdx + 1,
            action: 'step',
            predicates: preds || [],
          })),
          total_steps: parsed.length,
          name: 'Uploaded Trajectory',
        },
      ],
      returns: [],
    };
  }

  throw new Error(
    'Unrecognized Blocks World format. Expected JSON with "traj_histories", "episodes", or trajectory array.'
  );
}

/**
 * Saves a trajectory JSON file directly into the browser's IndexedDB.
 */
export async function saveRunToIndexedDB(
  fileName: string,
  rawJson: any
): Promise<RunSummary> {
  const db = await getDB();
  const { histories, returns } = normalizeClientJson(rawJson);

  if (!histories || histories.length === 0) {
    throw new Error('No trajectory episodes found in the uploaded JSON file.');
  }

  // Generate unique run ID
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const runId = `idb_${Date.now()}_${cleanName.replace(/\.json$/i, '')}.json`;

  let avgReturn: number | undefined;
  let maxReturn: number | undefined;
  if (returns.length > 0) {
    const sum = returns.reduce((a, b) => a + b, 0);
    avgReturn = Number((sum / returns.length).toFixed(2));
    maxReturn = Number(Math.max(...returns).toFixed(2));
  }

  const runRecord: StoredRunRecord = {
    id: runId,
    name: cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`,
    totalEpisodes: histories.length,
    returns,
    avgReturn,
    maxReturn,
    createdAt: Date.now(),
  };

  // Convert each history into Episode format and store in IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['runs', 'episodes'], 'readwrite');
    const runsStore = tx.objectStore('runs');
    const episodesStore = tx.objectStore('episodes');

    runsStore.put(runRecord);

    for (let idx = 0; idx < histories.length; idx++) {
      const rawEpisode = histories[idx];
      const trajectory: string[][] = [rawEpisode.initial_state || []];
      const actions: string[] = ['initial_state'];

      for (const s of rawEpisode.steps || []) {
        trajectory.push(s.predicates || []);
        actions.push(s.action || 'step');
      }

      const ret = returns[idx];

      const episodeData: Episode = {
        episode_id: idx,
        name:
          rawEpisode.name ||
          `${runRecord.name.replace(/\.json$/i, '')} — Epoch #${idx + 1} ${
            ret !== undefined ? ` (Return: ${ret.toFixed(2)})` : ''
          }`,
        total_steps: trajectory.length,
        trajectory,
        actions,
        return: ret !== undefined ? Number(ret.toFixed(2)) : undefined,
        success: ret !== undefined ? ret > 2.0 : undefined,
      };

      const episodeRecord: StoredEpisodeRecord = {
        runId,
        episodeIndex: idx,
        episode: episodeData,
      };

      episodesStore.put(episodeRecord);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to save episodes in IndexedDB'));
  });

  return {
    id: runRecord.id,
    name: runRecord.name,
    path: `[Browser Storage] ${runRecord.name}`,
    totalEpisodes: runRecord.totalEpisodes,
    returnsAvailable: returns.length > 0,
    avgReturn: runRecord.avgReturn,
    maxReturn: runRecord.maxReturn,
    source: 'indexeddb',
  };
}

/**
 * Lists all runs stored in IndexedDB.
 */
export async function getBrowserRuns(): Promise<RunSummary[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('runs', 'readonly');
      const store = tx.objectStore('runs');
      const request = store.getAll();

      request.onsuccess = () => {
        const records: StoredRunRecord[] = request.result || [];
        const summaries: RunSummary[] = records.map((r) => ({
          id: r.id,
          name: r.name,
          path: `[Browser Storage] ${r.name}`,
          totalEpisodes: r.totalEpisodes,
          returnsAvailable: (r.returns || []).length > 0,
          avgReturn: r.avgReturn,
          maxReturn: r.maxReturn,
          source: 'indexeddb',
        }));
        resolve(summaries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to list runs from IndexedDB:', err);
    return [];
  }
}

/**
 * Gets a specific episode from IndexedDB.
 */
export async function getBrowserEpisode(
  runId: string,
  episodeIndex: number
): Promise<Episode | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('episodes', 'readonly');
    const store = tx.objectStore('episodes');
    const request = store.get([runId, episodeIndex]);

    request.onsuccess = () => {
      const record: StoredEpisodeRecord | undefined = request.result;
      if (record && record.episode) {
        resolve(record.episode);
        return;
      }

      // Check fallback: if 1-based index was passed (e.g. 10000 -> 9999)
      if (episodeIndex > 0) {
        const fallbackReq = store.get([runId, episodeIndex - 1]);
        fallbackReq.onsuccess = () => {
          resolve(fallbackReq.result?.episode || null);
        };
        fallbackReq.onerror = () => resolve(null);
        return;
      }

      resolve(null);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Gets a paginated list of episode headers for a given IndexedDB run.
 */
export async function getBrowserEpisodesPage(
  runId: string,
  options: { page?: number; limit?: number; filter?: 'all' | 'positive' | 'negative' } = {}
): Promise<{ total: number; episodes: EpisodeListItem[] }> {
  const db = await getDB();

  // Retrieve run metadata for fast return filtering
  const runRecord = await new Promise<StoredRunRecord | null>((resolve) => {
    const tx = db.transaction('runs', 'readonly');
    const req = tx.objectStore('runs').get(runId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  if (!runRecord) {
    return { total: 0, episodes: [] };
  }

  const returns = runRecord.returns || [];
  let items: EpisodeListItem[] = [];

  for (let idx = 0; idx < runRecord.totalEpisodes; idx++) {
    const ret = returns[idx] !== undefined ? Number(returns[idx].toFixed(2)) : undefined;
    items.push({
      index: idx,
      episode_id: idx,
      total_steps: 1, // fast summary
      return: ret,
      isSuccess: ret !== undefined ? ret > 2.0 : false,
    });
  }

  if (options.filter === 'positive') {
    items = items.filter((item) => (item.return ?? -999) > 0);
  } else if (options.filter === 'negative') {
    items = items.filter((item) => (item.return ?? 0) <= 0);
  }

  const total = items.length;
  const page = options.page || 1;
  const limit = options.limit || 40;
  const start = (page - 1) * limit;
  const paginated = items.slice(start, start + limit);

  return { total, episodes: paginated };
}

/**
 * Renames an IndexedDB run.
 */
export async function renameBrowserRun(runId: string, newName: string): Promise<string> {
  const db = await getDB();
  const cleanName = newName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalized = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite');
    const store = tx.objectStore('runs');
    const req = store.get(runId);

    req.onsuccess = () => {
      const record: StoredRunRecord | undefined = req.result;
      if (!record) {
        reject(new Error(`Run "${runId}" not found in browser storage.`));
        return;
      }

      record.name = finalized;
      store.put(record);
      tx.oncomplete = () => resolve(finalized);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes an IndexedDB run and all of its stored episodes.
 */
export async function deleteBrowserRun(runId: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['runs', 'episodes'], 'readwrite');
    const runsStore = tx.objectStore('runs');
    const episodesStore = tx.objectStore('episodes');

    // 1. Delete run summary
    runsStore.delete(runId);

    // 2. Delete all episodes using by_runId index
    const index = episodesStore.index('by_runId');
    const range = IDBKeyRange.only(runId);
    const req = index.openCursor(range);

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Failed to delete run from IndexedDB'));
  });
}
