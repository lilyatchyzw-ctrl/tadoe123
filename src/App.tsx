import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Volume2, VolumeX } from 'lucide-react';
import {
  AcousticPulse,
  FieldMode,
  FieldNode,
  FluxSong,
  NodeKind,
  OfflineSongRecord,
  PremiumSubscription,
  SavedConfigPreset,
  SimulationParams,
  TelemetrySample,
  ToolMode,
} from './types/flux';
import { DEFAULT_PARAMS, FIELD_PRESETS } from './engine/fieldMath';
import { fluxAudio, HarmonicTriggerDef } from './engine/audioEngine';
import {
  createConfigPreset,
  loadSavedPresets,
  loadSongsPlayedCount,
  loadSubscription,
  persistSavedPresets,
  saveSongsPlayedCount,
  saveSubscription,
} from './engine/presetStorage';
import {
  evaluateOfflineEligibility,
  FLUX_SONGS,
  loadOfflineSongRecords,
  removeOfflineSong,
  saveSongOffline,
} from './engine/offlineAudioStore';
import { fluxSongPlayer } from './engine/songPlayer';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import { FluxCanvas } from './components/FluxCanvas';
import { ConsoleTab, ControlConsole } from './components/ControlConsole';
import { TelemetryChart } from './components/TelemetryChart';
import { FieldGuideModal } from './components/FieldGuideModal';
import { SaveConfigModal } from './components/SaveConfigModal';
import { PremiumCheckoutModal } from './components/PremiumCheckoutModal';

const MAX_TELEMETRY_SAMPLES = 90;

function nextNodeLabel(kind: NodeKind, index: number): string {
  const sub = String(index);
  if (kind === 'source') return `+Q${sub}`;
  if (kind === 'sink') return `−Q${sub}`;
  if (kind === 'vortex-cw') return `↻${sub}`;
  return `↺${sub}`;
}

export default function App() {
  const [activeMode, setActiveMode] = useState<FieldMode>('sandbox');
  const [nodes, setNodes] = useState<FieldNode[]>(() =>
    FIELD_PRESETS.sandbox.nodes.map((n) => ({ ...n }))
  );
  const [params, setParams] = useState<SimulationParams>(() => ({
    ...DEFAULT_PARAMS,
    ...FIELD_PRESETS.sandbox.params,
  }));
  const [tool, setTool] = useState<ToolMode>('stir');
  const [isPlaying, setIsPlaying] = useState(true);
  const [stepTrigger, setStepTrigger] = useState(0);
  const [reseedTrigger, setReseedTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('field');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  const [fps, setFps] = useState(60);
  const [telemetry, setTelemetry] = useState<TelemetrySample[]>([]);
  const [sonificationOn, setSonificationOn] = useState(false);
  const [activeHarmonicId, setActiveHarmonicId] = useState<string | null>(null);
  const [acousticPulse, setAcousticPulse] = useState<AcousticPulse | null>(null);

  // Saved Configurations, Offline Songs, Subscription, and Voice Ad state
  const [savedPresets, setSavedPresets] = useState<SavedConfigPreset[]>(() =>
    loadSavedPresets()
  );
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(() =>
    loadSubscription()
  );
  const [offlineRecords, setOfflineRecords] = useState<OfflineSongRecord[]>(() =>
    loadOfflineSongRecords()
  );
  const [isSavingOfflineId, setIsSavingOfflineId] = useState<string | null>(null);

  const [currentSongIdx, setCurrentSongIdx] = useState(0);
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const [songElapsedSec, setSongElapsedSec] = useState(0);
  const [songsPlayedCount, setSongsPlayedCount] = useState<number>(() =>
    loadSongsPlayedCount()
  );
  const [voiceAdRemainingSec, setVoiceAdRemainingSec] = useState<number | null>(null);

  const { isInstalled, downloadedAt, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const nodeCounterRef = useRef(4);
  const pulseCounterRef = useRef(1);
  const harmonicFlashTimerRef = useRef<number | null>(null);
  const isPremiumRef = useRef(!!subscription?.active);
  isPremiumRef.current = !!subscription?.active;

  const songsPlayedRef = useRef(songsPlayedCount);
  songsPlayedRef.current = songsPlayedCount;

  const currentSong = FLUX_SONGS[currentSongIdx % FLUX_SONGS.length];

  const offlineEligibility = useMemo(
    () => evaluateOfflineEligibility(downloadedAt, !!subscription?.active),
    [downloadedAt, subscription]
  );

  // Cleanup song/ad timers on unmount
  useEffect(() => {
    return () => {
      fluxSongPlayer.stopSong();
      fluxSongPlayer.stopVoiceAd();
    };
  }, []);

  const applyPreset = useCallback((mode: FieldMode) => {
    const preset = FIELD_PRESETS[mode];
    setActiveMode(mode);
    setNodes(preset.nodes.map((n) => ({ ...n })));
    setParams((prev) => ({
      ...prev,
      ...preset.params,
    }));
    setTelemetry([]);
    setReseedTrigger((c) => c + 1);
  }, []);

  const handleUpdateParam = useCallback(
    <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAddNode = useCallback((kind: NodeKind, x: number, y: number) => {
    const seq = nodeCounterRef.current++;
    const id = `node-${Date.now()}-${seq}`;
    const label = nextNodeLabel(kind, seq);
    const newNode: FieldNode = {
      id,
      type: kind,
      x,
      y,
      strength: 1.4,
      label,
    };
    setNodes((prev) => [...prev, newNode]);
    return id;
  }, []);

  const handleMoveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, x, y } : n))
    );
  }, []);

  const handleUpdateNodeStrength = useCallback((id: string, strength: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, strength } : n))
    );
  }, []);

  const handleRemoveNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleTelemetrySample = useCallback((sample: TelemetrySample) => {
    fluxAudio.updateFieldModulation(sample.meanSpeed, sample.meanCurl);
    setTelemetry((prev) => {
      const next = [...prev, sample];
      return next.length > MAX_TELEMETRY_SAMPLES
        ? next.slice(next.length - MAX_TELEMETRY_SAMPLES)
        : next;
    });
  }, []);

  const handleToggleSonification = useCallback(() => {
    setSonificationOn((prev) => {
      const next = !prev;
      fluxAudio.setSonification(next);
      return next;
    });
  }, []);

  const spawnPulse = useCallback(
    (freqHz: number, label: string, color = '#22D3EE') => {
      const targetNode =
        nodes.length > 0
          ? nodes[pulseCounterRef.current % nodes.length]
          : null;
      setAcousticPulse({
        id: pulseCounterRef.current++,
        freqHz,
        label,
        x: targetNode ? targetNode.x : 0.5,
        y: targetNode ? targetNode.y : 0.5,
        color,
      });
    },
    [nodes]
  );

  const handleTriggerHarmonic = useCallback(
    (trigger: HarmonicTriggerDef) => {
      fluxAudio.triggerNote(trigger.freqHz, trigger.waveform);
      setActiveHarmonicId(trigger.id);
      if (harmonicFlashTimerRef.current !== null) {
        window.clearTimeout(harmonicFlashTimerRef.current);
      }
      harmonicFlashTimerRef.current = window.setTimeout(() => {
        setActiveHarmonicId(null);
      }, 240);

      const colorMap: Record<HarmonicTriggerDef['accent'], string> = {
        cyan: '#22D3EE',
        amber: '#F59E0B',
        sky: '#38BDF8',
        emerald: '#34D399',
      };
      spawnPulse(
        trigger.freqHz,
        `${trigger.note} · ${trigger.freqHz.toFixed(0)} Hz`,
        colorMap[trigger.accent]
      );
    },
    [spawnPulse]
  );

  const playSongAtIndex = useCallback(
    (idx: number, offsetSec = 0) => {
      const song = FLUX_SONGS[idx % FLUX_SONGS.length];
      setCurrentSongIdx(idx % FLUX_SONGS.length);
      setSongElapsedSec(offsetSec);
      setIsSongPlaying(true);

      void fluxSongPlayer.startSong(song, offsetSec, {
        onProgress: (elapsed) => setSongElapsedSec(elapsed),
        onStepPulse: (freq) => {
          spawnPulse(freq, song.title, '#22D3EE');
        },
        onSongEnded: () => {
          setIsSongPlaying(false);
          setSongElapsedSec(0);
          const nextCount = songsPlayedRef.current + 1;
          songsPlayedRef.current = nextCount;
          setSongsPlayedCount(nextCount);
          saveSongsPlayedCount(nextCount);

          const nextIdx = (idx + 1) % FLUX_SONGS.length;
          if (!isPremiumRef.current && nextCount % 5 === 0) {
            fluxSongPlayer.playVoiceAd(
              (rem) => setVoiceAdRemainingSec(rem),
              () => {
                setVoiceAdRemainingSec(null);
                playSongAtIndex(nextIdx, 0);
              }
            );
          } else {
            playSongAtIndex(nextIdx, 0);
          }
        },
      });
    },
    [spawnPulse]
  );

  const handleToggleSongPlay = useCallback(
    (targetSong?: FluxSong) => {
      if (voiceAdRemainingSec !== null) return;
      if (targetSong && targetSong.id !== currentSong.id) {
        const idx = FLUX_SONGS.findIndex((s) => s.id === targetSong.id);
        playSongAtIndex(idx >= 0 ? idx : 0, 0);
        return;
      }

      if (isSongPlaying) {
        fluxSongPlayer.stopSong();
        setIsSongPlaying(false);
      } else {
        const resumeOffset =
          songElapsedSec >= currentSong.durationSec - 0.5 ? 0 : songElapsedSec;
        playSongAtIndex(currentSongIdx, resumeOffset);
      }
    },
    [
      voiceAdRemainingSec,
      currentSong,
      isSongPlaying,
      songElapsedSec,
      currentSongIdx,
      playSongAtIndex,
    ]
  );

  const handleNextSong = useCallback(() => {
    if (voiceAdRemainingSec !== null) return;
    fluxSongPlayer.stopSong();

    // Count completed/skipped song toward the 5-song voice ad threshold when music was active
    let nextCount = songsPlayedRef.current;
    if (isSongPlaying || songElapsedSec > 1) {
      nextCount += 1;
      songsPlayedRef.current = nextCount;
      setSongsPlayedCount(nextCount);
      saveSongsPlayedCount(nextCount);
    }

    const nextIdx = (currentSongIdx + 1) % FLUX_SONGS.length;
    if (!isPremiumRef.current && nextCount > 0 && nextCount % 5 === 0) {
      setIsSongPlaying(false);
      setSongElapsedSec(0);
      fluxSongPlayer.playVoiceAd(
        (rem) => setVoiceAdRemainingSec(rem),
        () => {
          setVoiceAdRemainingSec(null);
          playSongAtIndex(nextIdx, 0);
        }
      );
    } else {
      playSongAtIndex(nextIdx, 0);
    }
  }, [
    voiceAdRemainingSec,
    isSongPlaying,
    songElapsedSec,
    currentSongIdx,
    playSongAtIndex,
  ]);

  const handleSaveSongOffline = useCallback(
    async (song: FluxSong) => {
      if (!offlineEligibility.canSaveOffline) return;
      setIsSavingOfflineId(song.id);
      try {
        await saveSongOffline(song);
        setOfflineRecords(loadOfflineSongRecords());
      } finally {
        setIsSavingOfflineId(null);
      }
    },
    [offlineEligibility.canSaveOffline]
  );

  const handleRemoveSongOffline = useCallback(async (songId: string) => {
    await removeOfflineSong(songId);
    setOfflineRecords(loadOfflineSongRecords());
  }, []);

  // Save Configuration Handlers
  const handleSaveConfig = useCallback(
    (name: string) => {
      const preset = createConfigPreset(name, activeMode, params, nodes);
      setSavedPresets((prev) => {
        const next = [preset, ...prev];
        persistSavedPresets(next);
        return next;
      });
      setConsoleTab('presets');
    },
    [activeMode, params, nodes]
  );

  const handleImportConfig = useCallback((preset: SavedConfigPreset) => {
    setSavedPresets((prev) => {
      const next = [preset, ...prev];
      persistSavedPresets(next);
      return next;
    });
    setActiveMode(preset.baseMode);
    setParams(preset.params);
    setNodes(preset.nodes);
    setReseedTrigger((c) => c + 1);
    setConsoleTab('presets');
  }, []);

  const handleLoadSavedPreset = useCallback((preset: SavedConfigPreset) => {
    setActiveMode(preset.baseMode);
    setParams({ ...preset.params });
    setNodes(preset.nodes.map((n) => ({ ...n })));
    setTelemetry([]);
    setReseedTrigger((c) => c + 1);
  }, []);

  const handleDeleteSavedPreset = useCallback((id: string) => {
    setSavedPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistSavedPresets(next);
      return next;
    });
  }, []);

  const handleDownloadPresetJson = useCallback((preset: SavedConfigPreset) => {
    const blob = new Blob([JSON.stringify(preset, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Premium Checkout Handlers
  const handleCompletePayment = useCallback((sub: PremiumSubscription) => {
    saveSubscription(sub);
    setSubscription(sub);
    // Immediately clear any running voice ad upon upgrading
    fluxSongPlayer.stopVoiceAd();
    setVoiceAdRemainingSec(null);
  }, []);

  const handleCancelSubscription = useCallback(() => {
    saveSubscription(null);
    setSubscription(null);
  }, []);

  const handleExported = useCallback(
    (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = `flux-${activeMode}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    },
    [activeMode]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'r' || e.key === 'R') {
        setReseedTrigger((c) => c + 1);
      } else if (e.key === 'v' || e.key === 'V') {
        setParams((prev) => ({ ...prev, showVectors: !prev.showVectors }));
      } else if (e.key === 'h' || e.key === 'H') {
        setParams((prev) => ({ ...prev, showHeatmap: !prev.showHeatmap }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const activePreset = FIELD_PRESETS[activeMode];

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-[#07090E] text-slate-100">
      {/* Three-Zone Top Bar */}
      <header className="flex items-center justify-between gap-8 px-6 h-14 border-b border-[#1E293B] bg-[#0B0F17] shrink-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            applyPreset('sandbox');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          Flux
        </a>

        <nav
          aria-label="Field presets and documentation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {(
            [
              { id: 'sandbox', label: 'Sandbox' },
              { id: 'magnetics', label: 'Magnetics' },
              { id: 'vortex', label: 'Vortex' },
              { id: 'turbulence', label: 'Turbulence' },
            ] as const
          ).map((item) => {
            const isActive = activeMode === item.id && !guideOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setGuideOpen(false);
                  applyPreset(item.id);
                }}
                className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'border-cyan-400 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              guideOpen
                ? 'border-cyan-400 text-slate-100'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            Equations
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setExportTrigger((c) => c + 1)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </header>

      {/* Mobile Preset Switcher */}
      <div className="flex md:hidden items-center gap-4 px-4 py-2 border-b border-[#1E293B] bg-[#0B0F17] overflow-x-auto text-xs font-medium shrink-0">
        {(['sandbox', 'magnetics', 'vortex', 'turbulence'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => applyPreset(id)}
            className={`py-1 whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === id ? 'text-cyan-400 font-semibold' : 'text-slate-400'
            }`}
          >
            {FIELD_PRESETS[id].id.charAt(0).toUpperCase() + FIELD_PRESETS[id].id.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="py-1 whitespace-nowrap shrink-0 text-slate-400 cursor-pointer"
        >
          Equations
        </button>
      </div>

      {/* Main Split Laboratory Console */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        <ControlConsole
          activeTab={consoleTab}
          onSelectTab={setConsoleTab}
          isPlaying={isPlaying}
          tool={tool}
          params={params}
          nodes={nodes}
          sonificationOn={sonificationOn}
          activeHarmonicId={activeHarmonicId}
          subscription={subscription}
          savedPresets={savedPresets}
          currentSong={currentSong}
          isSongPlaying={isSongPlaying}
          songElapsedSec={songElapsedSec}
          songsPlayedCount={songsPlayedCount}
          voiceAdRemainingSec={voiceAdRemainingSec}
          offlineRecords={offlineRecords}
          offlineEligibility={offlineEligibility}
          isOnline={isOnline}
          isAppInstalled={isInstalled}
          isSavingOfflineId={isSavingOfflineId}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onStep={() => setStepTrigger((c) => c + 1)}
          onReseed={() => setReseedTrigger((c) => c + 1)}
          onClearNodes={() => setNodes([])}
          onResetPreset={() => applyPreset(activeMode)}
          onSelectTool={setTool}
          onUpdateParam={handleUpdateParam}
          onUpdateNodeStrength={handleUpdateNodeStrength}
          onRemoveNode={handleRemoveNode}
          onToggleSonification={handleToggleSonification}
          onTriggerHarmonic={handleTriggerHarmonic}
          onOpenSaveConfig={() => setSaveModalOpen(true)}
          onLoadSavedPreset={handleLoadSavedPreset}
          onDeleteSavedPreset={handleDeleteSavedPreset}
          onDownloadPresetJson={handleDownloadPresetJson}
          onOpenPremium={() => setPremiumModalOpen(true)}
          onToggleSongPlay={handleToggleSongPlay}
          onNextSong={handleNextSong}
          onSaveSongOffline={handleSaveSongOffline}
          onRemoveSongOffline={handleRemoveSongOffline}
          onInstallApp={() => {
            void install();
          }}
        />

        {/* Right Stage & Telemetry Column */}
        <section className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Model Context Ribbon */}
          <div className="px-4 py-2.5 border-b border-[#1E293B] bg-[#0B0F17] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="font-display text-sm font-semibold text-slate-100 whitespace-nowrap">
                {activePreset.title}
              </h1>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                {activePreset.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 max-w-full">
              <div className="font-mono text-xs text-cyan-300/90 truncate">
                {activePreset.equation}
              </div>
              <button
                type="button"
                onClick={handleToggleSonification}
                aria-label={sonificationOn ? 'Mute field audio' : 'Enable field audio'}
                aria-pressed={sonificationOn}
                title={sonificationOn ? 'Mute field audio' : 'Enable field audio'}
                className={`p-1.5 rounded border transition-all active:scale-95 shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  sonificationOn
                    ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                    : 'bg-[#131924] border-[#1E293B] text-slate-400 hover:text-slate-100'
                }`}
              >
                {sonificationOn ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Dominant Simulation Viewport */}
          <FluxCanvas
            nodes={nodes}
            params={params}
            tool={tool}
            isPlaying={isPlaying}
            stepTrigger={stepTrigger}
            reseedTrigger={reseedTrigger}
            exportTrigger={exportTrigger}
            acousticPulse={acousticPulse}
            onAddNode={handleAddNode}
            onMoveNode={handleMoveNode}
            onRemoveNode={handleRemoveNode}
            onTelemetrySample={handleTelemetrySample}
            onFpsChange={setFps}
            onExported={handleExported}
          />

          {/* Bottom Real-Time Telemetry & Oscilloscope Tray */}
          <div className="border-t border-[#1E293B] bg-[#0D1119] p-4 shrink-0">
            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-center">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="border-b border-[#1E293B] pb-2">
                  <div className="text-[11px] text-slate-400">Mean Speed</div>
                  <div className="font-mono text-lg font-semibold text-slate-100 mt-0.5">
                    {latest ? latest.meanSpeed.toFixed(3) : '0.000'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">
                      u/s
                    </span>
                  </div>
                </div>

                <div className="border-b border-[#1E293B] pb-2">
                  <div className="text-[11px] text-slate-400">Peak Flux</div>
                  <div className="font-mono text-lg font-semibold text-cyan-400 mt-0.5">
                    {latest ? latest.peakFlux.toFixed(2) : '0.00'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">
                      |F|
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Mean Vorticity</div>
                  <div className="font-mono text-lg font-semibold text-amber-400 mt-0.5">
                    {latest ? latest.meanCurl.toFixed(2) : '0.00'}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">
                      rad/s
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400">Render Rate</div>
                  <div className="font-mono text-lg font-semibold text-slate-100 mt-0.5">
                    {fps}
                    <span className="text-[11px] font-normal text-slate-500 ml-1">
                      FPS · {params.particleCount} pts
                    </span>
                  </div>
                </div>
              </div>

              <TelemetryChart samples={telemetry} />
            </div>
          </div>
        </section>
      </main>

      <FieldGuideModal
        open={guideOpen}
        preset={activePreset}
        onClose={() => setGuideOpen(false)}
      />

      <SaveConfigModal
        open={saveModalOpen}
        activeMode={activeMode}
        params={params}
        nodes={nodes}
        savedCount={savedPresets.length}
        isPremium={!!subscription?.active}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveConfig}
        onImportJson={handleImportConfig}
        onOpenPremium={() => setPremiumModalOpen(true)}
      />

      <PremiumCheckoutModal
        open={premiumModalOpen}
        subscription={subscription}
        onClose={() => setPremiumModalOpen(false)}
        onCompletePayment={handleCompletePayment}
        onCancelSubscription={handleCancelSubscription}
      />
    </div>
  );
}
