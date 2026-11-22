import {
  FieldMode,
  FieldNode,
  PremiumSubscription,
  SavedConfigPreset,
  SimulationParams,
} from '../types/flux';

const PRESETS_KEY = 'flux_custom_presets_v1';
const SUBSCRIPTION_KEY = 'flux_premium_subscription_v1';
const SONGS_PLAYED_KEY = 'flux_songs_played_count_v1';

export const FREE_PRESET_LIMIT = 2;

export function loadSavedPresets(): SavedConfigPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedPresets(presets: SavedConfigPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage errors
  }
}

export function createConfigPreset(
  name: string,
  baseMode: FieldMode,
  params: SimulationParams,
  nodes: FieldNode[]
): SavedConfigPreset {
  return {
    id: `cfg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Untitled Configuration',
    createdAt: new Date().toISOString(),
    baseMode,
    params: { ...params },
    nodes: nodes.map((n) => ({ ...n })),
  };
}

export function loadSubscription(): PremiumSubscription | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PremiumSubscription;
    return parsed && parsed.active ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSubscription(sub: PremiumSubscription | null): void {
  try {
    if (!sub) {
      localStorage.removeItem(SUBSCRIPTION_KEY);
    } else {
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(sub));
    }
  } catch {
    // Ignore
  }
}

export function loadSongsPlayedCount(): number {
  try {
    const raw = localStorage.getItem(SONGS_PLAYED_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveSongsPlayedCount(count: number): void {
  try {
    localStorage.setItem(SONGS_PLAYED_KEY, String(count));
  } catch {
    // Ignore
  }
}
