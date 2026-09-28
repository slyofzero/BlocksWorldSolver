'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './Header';
import { Controls } from './Controls';
import { BlocksWorldCanvas } from './BlocksWorldCanvas';
import { InspectorPanel } from './InspectorPanel';
import { TimelineScrubber } from './TimelineScrubber';
import { EpisodeBrowserModal } from './EpisodeBrowserModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { SaveSettingsModal } from './SaveSettingsModal';

import { Episode, RunSummary } from '../lib/types';
import { parsePredicates, inferAction } from '../lib/predicateParser';
import { computeLayout, extractTrajectoryTableBases } from '../lib/layoutEngine';
import { calculatePredicateDiff } from '../lib/predicateDiff';
import { DEFAULT_TUTORIAL_EPISODES } from '../lib/constants';
import { AlertTriangle, CheckCircle2, Loader2, Boxes, Upload } from 'lucide-react';

const LAST_RUN_STORAGE_KEY = 'blocksworld_selected_run_id';
const DEFAULT_RUN_STORAGE_KEY = 'blocksworld_default_run_id';

export default function VisualizerClient() {
  // Available runs from server API
  const [availableRuns, setAvailableRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [totalEpisodesInRun, setTotalEpisodesInRun] = useState<number>(0);
  const [defaultRunId, setDefaultRunIdState] = useState<string | null>(null);

  // Save Settings Modal State
  const [manageModalRun, setManageModalRun] = useState<RunSummary | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);

  // Active Episode State (null when no run selected)
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [uploadedEpisodes, setUploadedEpisodes] = useState<Episode[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = 500ms
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // UI Modals & Interaction State
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [columnMode, setColumnMode] = useState<'stable' | 'compact'>('stable');
  const [isBrowserOpen, setIsBrowserOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isLoadingEpisode, setIsLoadingEpisode] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch specific episode from server API
  const loadServerEpisode = useCallback(async (runId: string, episodeIndex: number) => {
    setIsLoadingEpisode(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/runs/${runId}/episode/${episodeIndex}`);
      if (res.ok) {
        const data = await res.json();
        if (data.episode) {
          setCurrentEpisode(data.episode);
          setCurrentStep(0);
          setIsPlaying(false);
          return;
        }
      }
      // If episode index not found (e.g. #7 doesn't exist), try #0
      if (episodeIndex !== 0) {
        const fallbackRes = await fetch(`/api/runs/${runId}/episode/0`);
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.episode) {
            setCurrentEpisode(fallbackData.episode);
            setCurrentStep(0);
            setIsPlaying(false);
            return;
          }
        }
      }
      setErrorMessage(`Could not load episode ${episodeIndex} from ${runId}.`);
    } catch (err: any) {
      console.error('Error fetching episode:', err);
      setErrorMessage(`Error fetching episode: ${err.message}`);
    } finally {
      setIsLoadingEpisode(false);
    }
  }, []);

  // 2. Fetch available runs on initial mount (remembering user's last choice)
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await fetch('/api/runs');
        if (res.ok) {
          const data = await res.json();
          const runs: RunSummary[] = data.runs || [];
          setAvailableRuns(runs);

          // Get defaultRunId from server or localStorage
          const serverDefault = data.defaultRunId || null;
          const localDefault =
            typeof window !== 'undefined'
              ? localStorage.getItem(DEFAULT_RUN_STORAGE_KEY)
              : null;
          const effectiveDefault = serverDefault || localDefault || null;
          setDefaultRunIdState(effectiveDefault);

          // Restore user's last choice from localStorage if available
          const savedRunId =
            typeof window !== 'undefined'
              ? localStorage.getItem(LAST_RUN_STORAGE_KEY)
              : null;

          if (savedRunId) {
            if (savedRunId === 'tutorial') {
              setSelectedRunId('tutorial');
              setCurrentEpisode(DEFAULT_TUTORIAL_EPISODES[0]);
              return;
            }

            const matchingRun = runs.find((r) => r.id === savedRunId);
            if (matchingRun) {
              setSelectedRunId(matchingRun.id);
              setTotalEpisodesInRun(matchingRun.totalEpisodes);
              const defaultEpochIndex = matchingRun.totalEpisodes > 0 ? matchingRun.totalEpisodes - 1 : 0;
              loadServerEpisode(matchingRun.id, defaultEpochIndex);
              return;
            } else {
              // Run no longer exists in data/runs
              localStorage.removeItem(LAST_RUN_STORAGE_KEY);
            }
          }

          // If no previous choice, check if there is an active default save configured
          if (effectiveDefault) {
            const defaultMatching = runs.find(
              (r) => r.id === effectiveDefault || r.id === `${effectiveDefault}.json`
            );
            if (defaultMatching) {
              setSelectedRunId(defaultMatching.id);
              setTotalEpisodesInRun(defaultMatching.totalEpisodes);
              const defaultEpochIndex =
                defaultMatching.totalEpisodes > 0 ? defaultMatching.totalEpisodes - 1 : 0;
              loadServerEpisode(defaultMatching.id, defaultEpochIndex);
              return;
            }
          }

          // No default JSON selected by default
          setSelectedRunId('');
          setCurrentEpisode(null);
          return;
        }
      } catch (err) {
        console.error('Failed to query runs API:', err);
      }

      setSelectedRunId('');
      setCurrentEpisode(null);
    };

    fetchRuns();
  }, [loadServerEpisode]);

  // Refresh runs helper
  const refreshRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data = await res.json();
        const runs = data.runs || [];
        setAvailableRuns(runs);
        if (data.defaultRunId !== undefined) {
          setDefaultRunIdState(data.defaultRunId);
        }
        return runs as RunSummary[];
      }
    } catch (err) {
      console.error('Failed to refresh runs:', err);
    }
    return [];
  }, []);

  const handleRunRenamed = async (oldRunId: string, newRunId: string) => {
    const updatedRuns = await refreshRuns();
    if (selectedRunId === oldRunId) {
      setSelectedRunId(newRunId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_RUN_STORAGE_KEY, newRunId);
      }
    }
    if (defaultRunId === oldRunId) {
      setDefaultRunIdState(newRunId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEFAULT_RUN_STORAGE_KEY, newRunId);
      }
    }
    const matching = updatedRuns.find((r) => r.id === newRunId);
    if (matching) {
      setManageModalRun(matching);
    }
  };

  const handleRunDeleted = async (deletedRunId: string) => {
    const updatedRuns = await refreshRuns();
    if (selectedRunId === deletedRunId) {
      if (defaultRunId && defaultRunId !== deletedRunId) {
        const defRun = updatedRuns.find((r) => r.id === defaultRunId);
        if (defRun) {
          handleSelectRun(defRun.id);
          return;
        }
      }
      setSelectedRunId('');
      setCurrentEpisode(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_RUN_STORAGE_KEY);
      }
    }
    if (defaultRunId === deletedRunId) {
      setDefaultRunIdState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEFAULT_RUN_STORAGE_KEY);
      }
    }
    setIsManageModalOpen(false);
  };

  const handleSetDefault = async (newDefaultRunId: string | null) => {
    setDefaultRunIdState(newDefaultRunId);
    if (typeof window !== 'undefined') {
      if (newDefaultRunId) {
        localStorage.setItem(DEFAULT_RUN_STORAGE_KEY, newDefaultRunId);
      } else {
        localStorage.removeItem(DEFAULT_RUN_STORAGE_KEY);
      }
    }
    await refreshRuns();
  };

  // 3. Handle run selection change (persisting choice in localStorage)
  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);

    if (!runId) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_RUN_STORAGE_KEY);
      }
      setCurrentEpisode(null);
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_RUN_STORAGE_KEY, runId);
    }

    if (runId === 'tutorial') {
      setCurrentEpisode(DEFAULT_TUTORIAL_EPISODES[0]);
      setCurrentStep(0);
      setIsPlaying(false);
    } else if (runId === 'custom' && uploadedEpisodes.length > 0) {
      setCurrentEpisode(uploadedEpisodes[0]);
      setCurrentStep(0);
      setIsPlaying(false);
    } else {
      const run = availableRuns.find((r) => r.id === runId);
      if (run) {
        setTotalEpisodesInRun(run.totalEpisodes);
        const targetEpIndex = run.totalEpisodes > 0 ? run.totalEpisodes - 1 : 0;
        loadServerEpisode(runId, targetEpIndex);
      }
    }
  };

  // 4. Handle Local File Upload (.json) -> Saves to frontend/data/runs/
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Try uploading to server to store permanently in frontend/data/runs/
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/runs/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Refresh available runs list from server
        const runsRes = await fetch('/api/runs');
        if (runsRes.ok) {
          const runsData = await runsRes.json();
          if (runsData.runs) {
            setAvailableRuns(runsData.runs);
            const matching = runsData.runs.find((r: any) => r.id === data.runId);
            if (matching) {
              setTotalEpisodesInRun(matching.totalEpisodes);
            }
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_RUN_STORAGE_KEY, data.runId);
        }
        setSelectedRunId(data.runId);
        setUploadedFileName(file.name);
        setSuccessMessage(
          `Uploaded and saved "${file.name}" under frontend/data/runs/. Loaded ${data.totalEpisodes} episodes.`
        );
        const targetIndex = (data.totalEpisodes && data.totalEpisodes > 0) ? data.totalEpisodes - 1 : 0;
        await loadServerEpisode(data.runId, targetIndex);
        setIsUploading(false);
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }
    } catch (serverErr: any) {
      console.warn('Server upload error, falling back to client-memory parsing:', serverErr);
      setErrorMessage(`Upload error: ${serverErr.message}`);
    }

    // 2. Client-side fallback using FileReader if server upload was unavailable
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        let parsedEps: Episode[] = [];

        // Check Format A: { episodes: [ ... ] }
        if (Array.isArray(json.episodes)) {
          parsedEps = json.episodes.map((ep: any, idx: number) => ({
            episode_id: ep.episode_id ?? idx,
            name: ep.name || `Uploaded Episode #${ep.episode_id ?? idx}`,
            total_steps: ep.total_steps || ep.trajectory?.length || 0,
            trajectory: ep.trajectory || [],
            actions: ep.actions || [],
            return: ep.return,
            success: ep.success,
          }));
        }
        // Check Format B: { traj_histories: [ ... ] } (like diagnostics.json)
        else if (Array.isArray(json.traj_histories)) {
          parsedEps = json.traj_histories.slice(0, 100).map((th: any, idx: number) => {
            const traj: string[][] = [th.initial_state || []];
            const acts: string[] = ['initial_state'];
            for (const s of th.steps || []) {
              traj.push(s.predicates || []);
              acts.push(s.action || 'step');
            }
            const ret = json.returns?.[idx];
            return {
              episode_id: idx,
              name: `Uploaded Episode #${idx}${ret !== undefined ? ` (Return: ${ret.toFixed(2)})` : ''}`,
              total_steps: traj.length,
              trajectory: traj,
              actions: acts,
              return: ret,
              success: ret !== undefined ? ret > 2.0 : undefined,
            };
          });
        }
        // Check Format C: raw array of predicates (single episode)
        else if (Array.isArray(json) && Array.isArray(json[0])) {
          parsedEps = [
            {
              episode_id: 0,
              name: 'Uploaded Trajectory',
              total_steps: json.length,
              trajectory: json,
              actions: [],
            },
          ];
        }

        if (parsedEps.length > 0) {
          setUploadedEpisodes(parsedEps);
          setUploadedFileName(file.name);
          setSelectedRunId('custom');
          setCurrentEpisode(parsedEps[parsedEps.length - 1]);
          setCurrentStep(0);
          setIsPlaying(false);
          setSuccessMessage(`Loaded ${file.name} in memory.`);
        } else {
          setErrorMessage(
            'Could not find recognizable trajectory format in JSON file.'
          );
        }
      } catch (err: any) {
        console.error('File parse error:', err);
        setErrorMessage(`Invalid JSON file: ${err.message}`);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsText(file);
  };

  // 5. Pre-scan table bases for column stability
  const allEpisodeTableBases = useMemo(() => {
    return extractTrajectoryTableBases(currentEpisode?.trajectory || []);
  }, [currentEpisode]);

  // 6. Current Step Data & Layout Computation
  const totalSteps = currentEpisode?.trajectory?.length || 1;
  const currentPredicatesRaw = useMemo(() => {
    return currentEpisode?.trajectory?.[currentStep] || [];
  }, [currentEpisode?.trajectory, currentStep]);

  const prevPredicatesRaw = useMemo(() => {
    return currentStep > 0 ? currentEpisode?.trajectory?.[currentStep - 1] || null : null;
  }, [currentEpisode?.trajectory, currentStep]);

  const currentParsed = useMemo(() => {
    return parsePredicates(currentPredicatesRaw);
  }, [currentPredicatesRaw]);

  const prevParsed = useMemo(() => {
    return prevPredicatesRaw ? parsePredicates(prevPredicatesRaw) : null;
  }, [prevPredicatesRaw]);

  const prevLayout = useMemo(() => {
    if (!prevParsed) return null;
    return computeLayout(prevParsed, {
      columnMode,
      allEpisodeTableBases,
    });
  }, [prevParsed, columnMode, allEpisodeTableBases]);

  const currentLayout = useMemo(() => {
    return computeLayout(currentParsed, {
      columnMode,
      allEpisodeTableBases,
      previousLayout: prevLayout,
    });
  }, [currentParsed, columnMode, allEpisodeTableBases, prevLayout]);

  const predicateDiff = useMemo(() => {
    return calculatePredicateDiff(prevPredicatesRaw, currentPredicatesRaw);
  }, [prevPredicatesRaw, currentPredicatesRaw]);

  // Step Action inference
  const currentAction = useMemo(() => {
    if (currentEpisode?.actions && currentEpisode.actions[currentStep]) {
      const act = currentEpisode.actions[currentStep];
      let actType = 'step';
      if (act.toLowerCase().startsWith('pickup')) actType = 'pickup';
      else if (act.toLowerCase().startsWith('unstack')) actType = 'unstack';
      else if (act.toLowerCase().startsWith('stack')) actType = 'stack';
      else if (act.toLowerCase().startsWith('putdown')) actType = 'putdown';
      else if (act === 'initial_state' || currentStep === 0) actType = 'initial';
      return { name: act, type: actType };
    }
    return inferAction(prevParsed, currentParsed);
  }, [currentEpisode, currentStep, prevParsed, currentParsed]);

  // 7. Auto Playback Timer
  useEffect(() => {
    if (!isPlaying) return;

    // Interval derived from playbackSpeed: 1x = 500ms
    const intervalMs = Math.max(80, Math.round(500 / playbackSpeed));

    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps - 1) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalSteps, isLooping]);

  // Episode Index & Epoch Numbering (1-based: 1st episode = index 0, 10000th = index 9999)
  const currentEpisodeIndex = currentEpisode
    ? typeof currentEpisode.episode_id === 'number'
      ? currentEpisode.episode_id
      : parseInt(String(currentEpisode.episode_id), 10) || 0
    : 0;

  const totalEpochs =
    selectedRunId === 'tutorial'
      ? 1
      : uploadedEpisodes.length > 0
      ? uploadedEpisodes.length
      : totalEpisodesInRun || (currentEpisode ? 1 : 0);

  const currentEpochNumber = currentEpisodeIndex + 1;
  const canPrevEpoch = Boolean(currentEpisode && currentEpisodeIndex > 0);
  const canNextEpoch = Boolean(currentEpisode && currentEpisodeIndex < totalEpochs - 1);

  const handlePrevEpoch = useCallback(() => {
    if (currentEpisodeIndex > 0) {
      const prevIdx = currentEpisodeIndex - 1;
      if (selectedRunId !== 'tutorial' && selectedRunId !== 'custom') {
        loadServerEpisode(selectedRunId, prevIdx);
      } else if (uploadedEpisodes[prevIdx]) {
        setCurrentEpisode(uploadedEpisodes[prevIdx]);
        setCurrentStep(0);
        setIsPlaying(false);
      }
    }
  }, [currentEpisodeIndex, selectedRunId, loadServerEpisode, uploadedEpisodes]);

  const handleNextEpoch = useCallback(() => {
    if (currentEpisodeIndex < totalEpochs - 1) {
      const nextIdx = currentEpisodeIndex + 1;
      if (selectedRunId !== 'tutorial' && selectedRunId !== 'custom') {
        loadServerEpisode(selectedRunId, nextIdx);
      } else if (uploadedEpisodes[nextIdx]) {
        setCurrentEpisode(uploadedEpisodes[nextIdx]);
        setCurrentStep(0);
        setIsPlaying(false);
      }
    }
  }, [currentEpisodeIndex, totalEpochs, selectedRunId, loadServerEpisode, uploadedEpisodes]);

  // 8. Navigation Handlers
  const handleFirstStep = useCallback(() => setCurrentStep(0), []);
  const handlePrevStep = useCallback(() => setCurrentStep((s) => Math.max(0, s - 1)), []);
  const handleNextStep = useCallback(
    () => setCurrentStep((s) => Math.min(totalSteps - 1, s + 1)),
    [totalSteps]
  );
  const handleLastStep = useCallback(
    () => setCurrentStep(Math.max(0, totalSteps - 1)),
    [totalSteps]
  );
  const handleTogglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  // 9. Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevStep();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextStep();
          break;
        case 'BracketLeft':
        case 'PageUp':
          e.preventDefault();
          handlePrevEpoch();
          break;
        case 'BracketRight':
        case 'PageDown':
          e.preventDefault();
          handleNextEpoch();
          break;
        case 'Space':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'Home':
          e.preventDefault();
          handleFirstStep();
          break;
        case 'End':
          e.preventDefault();
          handleLastStep();
          break;
        case 'KeyL':
          e.preventDefault();
          setIsLooping((l) => !l);
          break;
        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            setIsShortcutsOpen((o) => !o);
          }
          break;
        case 'Escape':
          setIsBrowserOpen(false);
          setIsShortcutsOpen(false);
          setIsManageModalOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePrevStep,
    handleNextStep,
    handlePrevEpoch,
    handleNextEpoch,
    handleTogglePlay,
    handleFirstStep,
    handleLastStep,
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Header Toolbar */}
      <Header
        availableRuns={availableRuns}
        selectedRunId={selectedRunId}
        onSelectRun={handleSelectRun}
        currentEpisodeId={currentEpochNumber}
        totalEpisodesInRun={totalEpochs}
        onFileUpload={handleFileUpload}
        onResetToTutorial={() => {
          setSelectedRunId('tutorial');
          setCurrentEpisode(DEFAULT_TUTORIAL_EPISODES[0]);
          setCurrentStep(0);
          setIsPlaying(false);
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenEpisodeBrowser={() => setIsBrowserOpen(true)}
        onOpenSaveSettings={(run) => {
          setManageModalRun(run);
          setIsManageModalOpen(true);
        }}
        uploadedFileName={uploadedFileName}
        defaultRunId={defaultRunId}
        isUploading={isUploading}
      />

      {/* 2. Main Visualizer Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Success notification banner */}
        {successMessage && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {errorMessage && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {!currentEpisode ? (
          <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-10 sm:p-16 flex flex-col items-center justify-center text-center gap-6 my-6 shadow-2xl">
            <div className="h-16 w-16 rounded-2xl bg-sky-950/80 border border-sky-500/30 flex items-center justify-center shadow-lg shadow-sky-950">
              <Boxes className="w-8 h-8 text-sky-400" />
            </div>

            <div className="max-w-md flex flex-col gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                No Trajectory Run Selected
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {availableRuns.length > 0
                  ? 'Please select a trajectory run from the dropdown above, or upload a new model diagnostics JSON file.'
                  : 'frontend/data/runs is currently empty. Upload a training diagnostics or trajectory JSON file to begin inspecting states.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                  input?.click();
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Trajectory JSON</span>
              </button>

              <button
                onClick={() => handleSelectRun('tutorial')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                <span>Try Sample Tutorial Demo</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Episode Meta Header Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  {isLoadingEpisode && <Loader2 className="w-4 h-4 animate-spin text-sky-400" />}
                  <span>
                    {currentEpisode.name || `Epoch #${currentEpochNumber}`}
                  </span>
                </h2>

                {currentEpisode.return !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                      currentEpisode.return > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    Return: {currentEpisode.return}
                  </span>
                )}

                {currentEpisode.success && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Success
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>
                  Total Steps: <strong className="text-white">{totalSteps}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Blocks:{' '}
                  <strong className="text-sky-400">
                    {currentParsed.allBlocks.length}
                  </strong>
                </span>
              </div>
            </div>

            {/* 3. Visual Canvas & Diagnostics Workspace (Grid layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Visual Canvas & Step Scrubber (7 cols on large screens) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <BlocksWorldCanvas
                  layout={currentLayout}
                  hoveredBlock={hoveredBlock}
                  onHoverBlock={setHoveredBlock}
                  columnMode={columnMode}
                  onToggleColumnMode={() =>
                    setColumnMode((m) => (m === 'stable' ? 'compact' : 'stable'))
                  }
                />

                <Controls
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  isLooping={isLooping}
                  actionName={currentAction.name}
                  actionType={currentAction.type}
                  onStepChange={setCurrentStep}
                  onTogglePlay={handleTogglePlay}
                  onPrevEpoch={handlePrevEpoch}
                  onPrevStep={handlePrevStep}
                  onNextStep={handleNextStep}
                  onNextEpoch={handleNextEpoch}
                  canPrevEpoch={canPrevEpoch}
                  canNextEpoch={canNextEpoch}
                  currentEpochNumber={currentEpochNumber}
                  totalEpochs={totalEpochs}
                  onSpeedChange={setPlaybackSpeed}
                  onToggleLoop={() => setIsLooping((l) => !l)}
                  onOpenEpisodeBrowser={() => setIsBrowserOpen(true)}
                />
              </div>

              {/* Right Column: Inspector Panel (5 cols on large screens) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <InspectorPanel
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  actionName={currentAction.name}
                  parsedPredicates={currentParsed}
                  diff={predicateDiff}
                  hoveredBlock={hoveredBlock}
                />
              </div>
            </div>

            {/* 4. Bottom Trajectory Step Timeline */}
            <TimelineScrubber
              currentStep={currentStep}
              totalSteps={totalSteps}
              actions={currentEpisode.actions || []}
              onSelectStep={setCurrentStep}
            />
          </>
        )}
      </main>

      {/* 5. Modals */}
      <EpisodeBrowserModal
        isOpen={isBrowserOpen && Boolean(selectedRunId)}
        runId={selectedRunId}
        currentEpisodeId={currentEpisode ? currentEpisode.episode_id : 0}
        totalEpisodesInRun={totalEpisodesInRun}
        onClose={() => setIsBrowserOpen(false)}
        onSelectEpisode={(epId) => loadServerEpisode(selectedRunId, epId)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <SaveSettingsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        run={manageModalRun}
        allRuns={availableRuns}
        onSelectRunToManage={(r) => setManageModalRun(r)}
        onRunRenamed={handleRunRenamed}
        onRunDeleted={handleRunDeleted}
        onSetDefault={handleSetDefault}
        defaultRunId={defaultRunId}
      />
    </div>
  );
}
