export type FieldMode = 'sandbox' | 'magnetics' | 'vortex' | 'turbulence';

export type ToolMode =
  | 'stir'
  | 'source'
  | 'sink'
  | 'vortex-cw'
  | 'vortex-ccw'
  | 'probe';

export type ColorPalette = 'cyan' | 'amber' | 'viridis' | 'monochrome';

export type NodeKind = 'source' | 'sink' | 'vortex-cw' | 'vortex-ccw';

export interface FieldNode {
  id: string;
  type: NodeKind;
  /** Normalized horizontal coordinate [0, 1] */
  x: number;
  /** Normalized vertical coordinate [0, 1] */
  y: number;
  /** Dimensionless strength multiplier [0.2, 3.0] */
  strength: number;
  label: string;
}

export interface SimulationParams {
  particleCount: number;
  flowSpeed: number;
  trailPersistence: number;
  turbulenceIntensity: number;
  turbulenceScale: number;
  streamFlow: number;
  showStreamlines: boolean;
  showVectors: boolean;
  showHeatmap: boolean;
  showNodes: boolean;
  palette: ColorPalette;
}

export interface TelemetrySample {
  t: number;
  meanSpeed: number;
  peakFlux: number;
  meanCurl: number;
  energy: number;
}

export interface ProbeReading {
  x: number;
  y: number;
  fx: number;
  fy: number;
  magnitude: number;
  angleDeg: number;
  divergence: number;
  curl: number;
}

export interface PointerImpulse {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  repel: boolean;
}

export interface FieldPreset {
  id: FieldMode;
  title: string;
  subtitle: string;
  equation: string;
  nodes: FieldNode[];
  params: Partial<SimulationParams>;
}

export interface AcousticPulse {
  id: number;
  freqHz: number;
  label: string;
  x: number;
  y: number;
  color: string;
}

export interface SavedConfigPreset {
  id: string;
  name: string;
  createdAt: string;
  baseMode: FieldMode;
  params: SimulationParams;
  nodes: FieldNode[];
}

export interface FluxSong {
  id: string;
  title: string;
  subtitle: string;
  bpm: number;
  durationSec: number;
  scaleFreqs: number[];
  baseDroneHz: number;
  accent: 'cyan' | 'amber' | 'sky' | 'emerald';
}

export interface OfflineSongRecord {
  songId: string;
  savedAt: string;
  sizeBytes: number;
}

export interface PremiumSubscription {
  active: boolean;
  plan: 'monthly' | 'lifetime';
  paidAt: string;
  transactionId: string;
  amountLabel: string;
  cardLast4: string;
  email: string;
}


