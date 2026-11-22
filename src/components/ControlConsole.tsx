import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Trash2,
  MousePointer2,
  Plus,
  Minus,
  RotateCw,
  Compass,
  X,
  Music,
  Music2,
  AudioLines,
  Disc3,
  Radio,
  Volume2,
  VolumeX,
  BookmarkPlus,
  Crown,
  Download,
  Check,
  HardDriveDownload,
  FileJson,
  Lock,
  Megaphone,
  WifiOff,
} from 'lucide-react';
import {
  ColorPalette,
  FieldNode,
  FluxSong,
  OfflineSongRecord,
  PremiumSubscription,
  SavedConfigPreset,
  SimulationParams,
  ToolMode,
} from '../types/flux';
import { HARMONIC_TRIGGERS, HarmonicTriggerDef } from '../engine/audioEngine';
import { FLUX_SONGS, OfflineEligibility } from '../engine/offlineAudioStore';
import { FREE_PRESET_LIMIT } from '../engine/presetStorage';

export type ConsoleTab = 'field' | 'songs' | 'presets';

interface ControlConsoleProps {
  activeTab: ConsoleTab;
  onSelectTab: (tab: ConsoleTab) => void;
  isPlaying: boolean;
  tool: ToolMode;
  params: SimulationParams;
  nodes: FieldNode[];
  sonificationOn: boolean;
  activeHarmonicId: string | null;
  subscription: PremiumSubscription | null;
  savedPresets: SavedConfigPreset[];
  currentSong: FluxSong;
  isSongPlaying: boolean;
  songElapsedSec: number;
  songsPlayedCount: number;
  voiceAdRemainingSec: number | null;
  offlineRecords: OfflineSongRecord[];
  offlineEligibility: OfflineEligibility;
  isOnline: boolean;
  isAppInstalled: boolean;
  isSavingOfflineId: string | null;
  onTogglePlay: () => void;
  onStep: () => void;
  onReseed: () => void;
  onClearNodes: () => void;
  onResetPreset: () => void;
  onSelectTool: (tool: ToolMode) => void;
  onUpdateParam: <K extends keyof SimulationParams>(
    key: K,
    value: SimulationParams[K]
  ) => void;
  onUpdateNodeStrength: (id: string, strength: number) => void;
  onRemoveNode: (id: string) => void;
  onToggleSonification: () => void;
  onTriggerHarmonic: (trigger: HarmonicTriggerDef) => void;
  onOpenSaveConfig: () => void;
  onLoadSavedPreset: (preset: SavedConfigPreset) => void;
  onDeleteSavedPreset: (id: string) => void;
  onDownloadPresetJson: (preset: SavedConfigPreset) => void;
  onOpenPremium: () => void;
  onToggleSongPlay: (song?: FluxSong) => void;
  onNextSong: () => void;
  onSaveSongOffline: (song: FluxSong) => void;
  onRemoveSongOffline: (songId: string) => void;
  onInstallApp: () => void;
}

const TOOLS: Array<{ id: ToolMode; label: string; icon: React.ReactNode }> = [
  { id: 'stir', label: 'Stir', icon: <MousePointer2 className="w-3.5 h-3.5" /> },
  { id: 'source', label: 'Source', icon: <Plus className="w-3.5 h-3.5" /> },
  { id: 'sink', label: 'Sink', icon: <Minus className="w-3.5 h-3.5" /> },
  { id: 'vortex-cw', label: 'CW Vortex', icon: <RotateCw className="w-3.5 h-3.5" /> },
  { id: 'vortex-ccw', label: 'CCW Vortex', icon: <RotateCcw className="w-3.5 h-3.5" /> },
  { id: 'probe', label: 'Probe', icon: <Compass className="w-3.5 h-3.5" /> },
];

const PALETTES: Array<{ id: ColorPalette; label: string; swatch: string }> = [
  { id: 'cyan', label: 'Cyan', swatch: 'bg-gradient-to-r from-blue-600 via-cyan-400 to-sky-100' },
  { id: 'amber', label: 'Thermal', swatch: 'bg-gradient-to-r from-rose-700 via-amber-400 to-amber-100' },
  { id: 'viridis', label: 'Viridis', swatch: 'bg-gradient-to-r from-purple-900 via-emerald-500 to-yellow-300' },
  { id: 'monochrome', label: 'Silver', swatch: 'bg-gradient-to-r from-slate-600 via-slate-300 to-white' },
];

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals?: number;
  onChange: (val: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  decimals = 2,
  onChange,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between text-xs">
      <label className="text-slate-300 font-medium">{label}</label>
      <span className="font-mono text-slate-200">
        {value.toFixed(decimals)}
        {unit && <span className="text-slate-500 ml-1">{unit}</span>}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flux-slider w-full"
    />
  </div>
);

export const ControlConsole: React.FC<ControlConsoleProps> = ({
  activeTab,
  onSelectTab,
  isPlaying,
  tool,
  params,
  nodes,
  sonificationOn,
  activeHarmonicId,
  subscription,
  savedPresets,
  currentSong,
  isSongPlaying,
  songElapsedSec,
  songsPlayedCount,
  voiceAdRemainingSec,
  offlineRecords,
  offlineEligibility,
  isOnline,
  isAppInstalled,
  isSavingOfflineId,
  onTogglePlay,
  onStep,
  onReseed,
  onClearNodes,
  onResetPreset,
  onSelectTool,
  onUpdateParam,
  onUpdateNodeStrength,
  onRemoveNode,
  onToggleSonification,
  onTriggerHarmonic,
  onOpenSaveConfig,
  onLoadSavedPreset,
  onDeleteSavedPreset,
  onDownloadPresetJson,
  onOpenPremium,
  onToggleSongPlay,
  onNextSong,
  onSaveSongOffline,
  onRemoveSongOffline,
  onInstallApp,
}) => {
  const [offlineFeedback, setOfflineFeedback] = useState<string | null>(null);
  const isPremium = !!subscription?.active;

  const harmonicIcons = [
    <Music className="w-4 h-4" />,
    <Music2 className="w-4 h-4" />,
    <AudioLines className="w-4 h-4" />,
    <Disc3 className="w-4 h-4" />,
    <Radio className="w-4 h-4" />,
  ];

  const songsUntilAd = isPremium ? null : 5 - (songsPlayedCount % 5);

  const handleSaveOfflineClick = (song: FluxSong) => {
    setOfflineFeedback(null);
    if (!offlineEligibility.appDownloaded && !isPremium) {
      setOfflineFeedback('Download/Install the app first to activate your 12-day offline saving window.');
      return;
    }
    if (!offlineEligibility.canSaveOffline) {
      setOfflineFeedback('12-day free offline window ended. Upgrade to Premium for lifetime offline saves.');
      return;
    }
    onSaveSongOffline(song);
  };

  return (
    <aside className="w-full lg:w-[356px] shrink-0 bg-[#0D1119] border-b lg:border-b-0 lg:border-r border-[#1E293B] flex flex-col overflow-y-auto">
      {/* Transport & Quick Configuration Actions */}
      <div className="p-4 border-b border-[#1E293B] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Simulation Transport</span>
          <span
            className={`text-xs font-mono ${
              isPlaying ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {isPlaying ? '● Running' : '❚❚ Paused'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isPlaying
                ? 'bg-[#161E2E] text-slate-100 border border-[#2A364F] hover:bg-[#1E293B]'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStep}
            disabled={isPlaying}
            title="Advance single frame"
            className="px-3 py-2 text-xs font-medium rounded bg-[#131924] border border-[#1E293B] text-slate-200 hover:bg-[#1A2232] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onReseed}
            title="Reseed particles"
            className="px-3 py-2 text-xs font-medium rounded bg-[#131924] border border-[#1E293B] text-slate-200 hover:bg-[#1A2232] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reseed
          </button>

          <button
            type="button"
            onClick={onResetPreset}
            title="Reset preset defaults"
            className="px-3 py-2 text-xs font-medium rounded bg-[#131924] border border-[#1E293B] text-slate-200 hover:bg-[#1A2232] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Save Configuration + Premium Row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenSaveConfig}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-[#131924] border border-[#1E293B] text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Save Configuration</span>
          </button>

          <button
            type="button"
            onClick={onOpenPremium}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isPremium
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{isPremium ? 'Premium Active' : 'Go Premium'}</span>
          </button>
        </div>
      </div>

      {/* Pressable Music Icons & Field Sonification (Always visible) */}
      <div className="p-4 border-b border-[#1E293B] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Harmonic Audio</span>
          <button
            type="button"
            onClick={onToggleSonification}
            aria-pressed={sonificationOn}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              sonificationOn
                ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                : 'bg-[#131924] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            {sonificationOn ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{sonificationOn ? 'Drone On' : 'Drone Off'}</span>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {HARMONIC_TRIGGERS.map((trigger, idx) => {
            const pressed = activeHarmonicId === trigger.id;
            return (
              <button
                key={trigger.id}
                type="button"
                onClick={() => onTriggerHarmonic(trigger)}
                aria-label={`Play ${trigger.note} harmonic pulse (${trigger.freqHz} Hz)`}
                aria-pressed={pressed}
                title={`Play ${trigger.note} (${trigger.freqHz} Hz)`}
                className={`flex flex-col items-center justify-center gap-1 min-h-[44px] px-1.5 py-2 rounded border transition-all active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  pressed
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 scale-[0.97]'
                    : 'bg-[#131924] border-[#1E293B] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 hover:bg-[#162032]'
                }`}
              >
                {harmonicIcons[idx]}
                <span className="font-mono text-[10px] leading-none">
                  {trigger.note}
                </span>
              </button>
            );
          })}
        </div>

        {/* Voice Ad Active Alert (Always visible if triggered) */}
        {voiceAdRemainingSec !== null && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/40 rounded flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300">
              <span className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                <span>Voice Ad Playing</span>
              </span>
              <span className="font-mono">{voiceAdRemainingSec}s</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              5 free songs reached. Upgrade to Flux Premium for ad-free playback and lifetime offline songs.
            </p>
            <button
              type="button"
              onClick={onOpenPremium}
              className="self-start px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Remove Ads with Premium
            </button>
          </div>
        )}
      </div>

      {/* Console Section Switcher */}
      <div className="px-4 py-2.5 border-b border-[#1E293B] bg-[#090D14]">
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#07090E] border border-[#1E293B] rounded">
          {(
            [
              { id: 'field', label: 'Field' },
              { id: 'songs', label: `Songs (${FLUX_SONGS.length})` },
              { id: 'presets', label: `Saved (${savedPresets.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTab(t.id)}
              className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-[#162032] text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'field' && (
        <>
          {/* Canvas Interactive Tool */}
          <div className="p-4 border-b border-[#1E293B] flex flex-col gap-2.5">
            <span className="text-xs font-medium text-slate-400">Canvas Tool</span>
            <div className="grid grid-cols-3 gap-1.5">
              {TOOLS.map((item) => {
                const active = tool === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTool(item.id)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                        : 'bg-[#131924] border-[#1E293B] text-slate-300 hover:border-slate-700 hover:text-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field & Advection Parameters */}
          <div className="p-4 border-b border-[#1E293B] flex flex-col gap-3.5">
            <span className="text-xs font-medium text-slate-400">Field Parameters</span>

            <SliderControl
              label="Particle Count"
              value={params.particleCount}
              min={500}
              max={6000}
              step={100}
              unit="pts"
              decimals={0}
              onChange={(v) => onUpdateParam('particleCount', v)}
            />
            <SliderControl
              label="Advection Speed"
              value={params.flowSpeed}
              min={0.1}
              max={2.5}
              step={0.05}
              unit="×"
              onChange={(v) => onUpdateParam('flowSpeed', v)}
            />
            <SliderControl
              label="Trail Persistence"
              value={params.trailPersistence}
              min={0.78}
              max={0.97}
              step={0.01}
              unit=""
              onChange={(v) => onUpdateParam('trailPersistence', v)}
            />
            <SliderControl
              label="Curl Turbulence"
              value={params.turbulenceIntensity}
              min={0}
              max={2.5}
              step={0.05}
              unit="κ"
              onChange={(v) => onUpdateParam('turbulenceIntensity', v)}
            />
            <SliderControl
              label="Spatial Frequency"
              value={params.turbulenceScale}
              min={0.5}
              max={4.0}
              step={0.1}
              unit="Hz"
              decimals={1}
              onChange={(v) => onUpdateParam('turbulenceScale', v)}
            />
            <SliderControl
              label="Cross-Stream Bias"
              value={params.streamFlow}
              min={-1.5}
              max={1.5}
              step={0.05}
              unit="U₀"
              onChange={(v) => onUpdateParam('streamFlow', v)}
            />
          </div>

          {/* Layers & Color Mapping */}
          <div className="p-4 border-b border-[#1E293B] flex flex-col gap-3">
            <span className="text-xs font-medium text-slate-400">Render Layers & Ramp</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { key: 'showStreamlines', label: 'Streamlines' },
                  { key: 'showVectors', label: 'Vector Grid' },
                  { key: 'showHeatmap', label: 'Magnitude' },
                  { key: 'showNodes', label: 'Node Markers' },
                ] as const
              ).map((layer) => {
                const active = params[layer.key];
                return (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => onUpdateParam(layer.key, !active)}
                    className={`flex items-center justify-between px-2.5 py-2 text-xs rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#162032] border-cyan-500/40 text-slate-100'
                        : 'bg-[#131924] border-[#1E293B] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{layer.label}</span>
                    <span
                      className={`font-mono text-[10px] ${
                        active ? 'text-cyan-400' : 'text-slate-600'
                      }`}
                    >
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {PALETTES.map((pal) => {
                const active = params.palette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => onUpdateParam('palette', pal.id)}
                    className={`flex flex-col gap-1 p-1.5 rounded border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-[#162032]'
                        : 'border-[#1E293B] bg-[#131924] hover:border-slate-700'
                    }`}
                  >
                    <span className={`h-2 w-full rounded-xs ${pal.swatch}`} />
                    <span className="text-[11px] text-slate-300 truncate">{pal.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Field Nodes List */}
          <div className="p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Field Singularities ({nodes.length})
              </span>
              {nodes.length > 0 && (
                <button
                  type="button"
                  onClick={onClearNodes}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {nodes.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                No singularities placed. Choose Source, Sink, or Vortex above and click anywhere on the canvas.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[#1E293B] border border-[#1E293B] rounded bg-[#090D14]">
                {nodes.map((node) => (
                  <div key={node.id} className="px-3 py-2 flex items-center gap-2.5">
                    <span className="font-mono text-xs text-slate-200 w-10 shrink-0">
                      {node.label}
                    </span>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.1}
                      value={node.strength}
                      onChange={(e) =>
                        onUpdateNodeStrength(node.id, parseFloat(e.target.value))
                      }
                      className="flux-slider flex-1"
                      aria-label={`Strength for ${node.label}`}
                    />
                    <span className="font-mono text-xs text-slate-400 w-7 text-right shrink-0">
                      {node.strength.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveNode(node.id)}
                      aria-label={`Remove ${node.label}`}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'songs' && (
        <div className="p-4 flex flex-col gap-4">
          {/* App Download & 12-Day Offline Window */}
          <div className="p-3 bg-[#090D14] border border-[#1E293B] rounded flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-200">
                Offline Audio Window
              </span>
              {!isOnline && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </span>
              )}
            </div>

            {isPremium ? (
              <p className="text-xs text-emerald-400">
                Premium Active · Save songs offline anytime (12-day limit removed).
              </p>
            ) : offlineEligibility.appDownloaded ? (
              <p className="text-xs text-slate-400">
                {offlineEligibility.canSaveOffline ? (
                  <>
                    App downloaded ·{' '}
                    <span className="font-mono text-cyan-300">
                      {offlineEligibility.daysRemaining.toFixed(1)} days
                    </span>{' '}
                    left to save songs offline.
                  </>
                ) : (
                  <span className="text-amber-300">
                    12-day free offline window expired. Upgrade to Premium to save new songs offline.
                  </span>
                )}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-400">
                  Download/Install the app to save songs offline within 12 days.
                </p>
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAppInstalled ? 'App Downloaded' : 'Download / Install App'}</span>
                </button>
              </div>
            )}

            {offlineEligibility.appDownloaded && !isAppInstalled && (
              <button
                type="button"
                onClick={onInstallApp}
                className="self-start text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Install PWA Shortcut
              </button>
            )}
          </div>

          {/* Active Song Player */}
          <div className="p-3 bg-[#090D14] border border-[#1E293B] rounded flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100 truncate">
                  {currentSong.title}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentSong.subtitle} · {currentSong.bpm} BPM
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleSongPlay(currentSong)}
                  disabled={voiceAdRemainingSec !== null}
                  aria-label={isSongPlaying ? 'Pause song' : 'Play song'}
                  className="p-2 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSongPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onNextSong}
                  disabled={voiceAdRemainingSec !== null}
                  aria-label="Next song"
                  title="Next song"
                  className="p-2 rounded bg-[#131924] border border-[#1E293B] text-slate-200 hover:bg-[#1A2232] disabled:opacity-50 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{
                    width: `${Math.min(
                      100,
                      (songElapsedSec / currentSong.durationSec) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>
                  {songElapsedSec.toFixed(0)}s / {currentSong.durationSec}s
                </span>
                <span>
                  {isPremium
                    ? 'Premium · Ad-Free'
                    : `Voice ad in ${songsUntilAd} song${songsUntilAd === 1 ? '' : 's'} (${songsPlayedCount} played)`}
                </span>
              </div>
            </div>
          </div>

          {offlineFeedback && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-300 flex items-center justify-between gap-2">
              <span>{offlineFeedback}</span>
              {!offlineEligibility.appDownloaded ? (
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="px-2 py-1 rounded bg-cyan-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                >
                  Download
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenPremium}
                  className="px-2 py-1 rounded bg-amber-500 text-slate-950 font-semibold shrink-0 cursor-pointer"
                >
                  Premium
                </button>
              )}
            </div>
          )}

          {/* Track List with Pressable Play & Save Offline Buttons */}
          <div className="flex flex-col divide-y divide-[#1E293B] border border-[#1E293B] rounded bg-[#090D14]">
            {FLUX_SONGS.map((song) => {
              const isCurrent = currentSong.id === song.id;
              const isSavedOffline = offlineRecords.some(
                (r) => r.songId === song.id
              );
              const isSaving = isSavingOfflineId === song.id;

              return (
                <div
                  key={song.id}
                  className={`px-3 py-2.5 flex items-center justify-between gap-2 ${
                    isCurrent ? 'bg-[#131A27]' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSongPlay(song)}
                    disabled={voiceAdRemainingSec !== null}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <span
                      className={`p-1.5 rounded border shrink-0 ${
                        isCurrent && isSongPlaying
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-[#131924] border-[#1E293B] text-slate-300'
                      }`}
                    >
                      {isCurrent && isSongPlaying ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {song.title}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {song.durationSec}s · {song.bpm} BPM
                        {isSavedOffline ? ' · Cached Offline' : ''}
                      </div>
                    </div>
                  </button>

                  {isSavedOffline ? (
                    <button
                      type="button"
                      onClick={() => onRemoveSongOffline(song.id)}
                      title="Remove offline WAV cache"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Saved</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveOfflineClick(song)}
                      title="Save song offline"
                      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-[#1E293B] bg-[#131924] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors shrink-0 cursor-pointer"
                    >
                      <HardDriveDownload className="w-3 h-3" />
                      <span>{isSaving ? 'Saving…' : 'Offline'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'presets' && (
        <div className="p-4 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Custom JSON Presets ({savedPresets.length}
              {isPremium ? '' : `/${FREE_PRESET_LIMIT}`})
            </span>
            {!isPremium && (
              <button
                type="button"
                onClick={onOpenPremium}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Unlock Unlimited</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSaveConfig}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Current Configuration</span>
          </button>

          {savedPresets.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              No saved configurations yet. Click Save Current Configuration to store your field parameters and node layout as JSON in localStorage.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-[#1E293B] border border-[#1E293B] rounded bg-[#090D14]">
              {savedPresets.map((preset) => (
                <div key={preset.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {preset.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {preset.baseMode} · {preset.nodes.length} nodes ·{' '}
                        {preset.params.particleCount} pts
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedPreset(preset.id)}
                      aria-label={`Delete ${preset.name}`}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSavedPreset(preset)}
                      className="flex-1 py-1.5 px-2.5 text-xs font-medium rounded bg-[#162032] border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
                    >
                      Load Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => onDownloadPresetJson(preset)}
                      title="Download .json file"
                      className="flex items-center gap-1 py-1.5 px-2.5 text-xs font-medium rounded bg-[#131924] border border-[#1E293B] text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>.json</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
