import { FluxSong, OfflineSongRecord } from '../types/flux';

export const FLUX_SONGS: FluxSong[] = [
  {
    id: 'laminar-drift',
    title: 'Laminar Drift',
    subtitle: 'Ambient Sine Study',
    bpm: 72,
    durationSec: 20,
    scaleFreqs: [261.63, 293.66, 329.63, 392.0, 493.88, 523.25],
    baseDroneHz: 130.81,
    accent: 'cyan',
  },
  {
    id: 'quadrupole-nocturne',
    title: 'Quadrupole Nocturne',
    subtitle: 'Harmonic Fifths',
    bpm: 84,
    durationSec: 22,
    scaleFreqs: [220.0, 261.63, 329.63, 392.0, 440.0, 523.25],
    baseDroneHz: 110.0,
    accent: 'sky',
  },
  {
    id: 'karman-pulse',
    title: 'Karman Pulse',
    subtitle: 'Vortex Arpeggio',
    bpm: 96,
    durationSec: 20,
    scaleFreqs: [196.0, 246.94, 293.66, 369.99, 392.0, 493.88],
    baseDroneHz: 98.0,
    accent: 'amber',
  },
  {
    id: 'curl-cascade',
    title: 'Curl Cascade',
    subtitle: 'Spectral Overtones',
    bpm: 78,
    durationSec: 24,
    scaleFreqs: [174.61, 220.0, 261.63, 329.63, 349.23, 440.0],
    baseDroneHz: 87.31,
    accent: 'emerald',
  },
  {
    id: 'harmonic-equilibrium',
    title: 'Harmonic Equilibrium',
    subtitle: 'Resonant Bell',
    bpm: 68,
    durationSec: 22,
    scaleFreqs: [293.66, 329.63, 392.0, 440.0, 523.25, 587.33],
    baseDroneHz: 146.83,
    accent: 'cyan',
  },
  {
    id: 'biot-savart-study',
    title: 'Biot-Savart Study',
    subtitle: 'Rotating Field',
    bpm: 90,
    durationSec: 24,
    scaleFreqs: [246.94, 293.66, 369.99, 440.0, 493.88, 587.33],
    baseDroneHz: 123.47,
    accent: 'amber',
  },
];

const DB_NAME = 'flux-offline-audio';
const STORE_NAME = 'songs';
const META_KEY = 'flux_offline_songs_v1';
const TWELVE_DAYS_MS = 12 * 24 * 60 * 60 * 1000;

export interface OfflineEligibility {
  canSaveOffline: boolean;
  appDownloaded: boolean;
  daysElapsed: number;
  daysRemaining: number;
  reason: 'premium' | 'within-window' | 'not-downloaded' | 'expired';
}

export function evaluateOfflineEligibility(
  downloadedAt: number | null,
  isPremium: boolean
): OfflineEligibility {
  if (isPremium) {
    return {
      canSaveOffline: true,
      appDownloaded: true,
      daysElapsed: downloadedAt
        ? Math.max(0, (Date.now() - downloadedAt) / (24 * 60 * 60 * 1000))
        : 0,
      daysRemaining: Infinity,
      reason: 'premium',
    };
  }

  if (!downloadedAt) {
    return {
      canSaveOffline: false,
      appDownloaded: false,
      daysElapsed: 0,
      daysRemaining: 12,
      reason: 'not-downloaded',
    };
  }

  const elapsedMs = Math.max(0, Date.now() - downloadedAt);
  const daysElapsed = elapsedMs / (24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, (TWELVE_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000));
  const withinWindow = elapsedMs < TWELVE_DAYS_MS;

  return {
    canSaveOffline: withinWindow,
    appDownloaded: true,
    daysElapsed,
    daysRemaining,
    reason: withinWindow ? 'within-window' : 'expired',
  };
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Synthesizes a FluxSong into an authentic 16-bit PCM WAV Blob for offline storage.
 */
export function synthesizeSongToWavBlob(song: FluxSong): Blob {
  const sampleRate = 22050;
  const totalSamples = Math.floor(song.durationSec * sampleRate);
  const dataBytes = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const stepSec = 60 / song.bpm;
  const twoPi = Math.PI * 2;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Fade in / out envelope
    const fadeIn = Math.min(1, t / 0.6);
    const fadeOut = Math.min(1, (song.durationSec - t) / 0.8);
    const masterEnv = fadeIn * fadeOut;

    // Warm harmonic drone bed
    const drone =
      0.18 * Math.sin(twoPi * song.baseDroneHz * t) +
      0.08 * Math.sin(twoPi * song.baseDroneHz * 1.5 * t);

    // Arpeggiated melodic step
    const stepIdx = Math.floor(t / stepSec);
    const localT = t - stepIdx * stepSec;
    const noteFreq = song.scaleFreqs[(stepIdx * 3 + (stepIdx % 2)) % song.scaleFreqs.length];
    const noteEnv = Math.min(1, localT / 0.025) * Math.exp(-localT * 3.4);
    const voice =
      0.26 * Math.sin(twoPi * noteFreq * t) +
      0.09 * Math.sin(twoPi * noteFreq * 2.002 * t);

    const sample = Math.max(-0.95, Math.min(0.95, (drone + voice * noteEnv) * masterEnv));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function loadOfflineSongRecords(): OfflineSongRecord[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOfflineSongRecords(records: OfflineSongRecord[]) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage error
  }
}

export async function saveSongOffline(song: FluxSong): Promise<OfflineSongRecord> {
  const blob = synthesizeSongToWavBlob(song);
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, song.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  const record: OfflineSongRecord = {
    songId: song.id,
    savedAt: new Date().toISOString(),
    sizeBytes: blob.size,
  };
  const existing = loadOfflineSongRecords().filter((r) => r.songId !== song.id);
  saveOfflineSongRecords([...existing, record]);
  return record;
}

export async function getOfflineSongBlob(songId: string): Promise<Blob | null> {
  try {
    const db = await openOfflineDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(songId);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function removeOfflineSong(songId: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(songId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
  const next = loadOfflineSongRecords().filter((r) => r.songId !== songId);
  saveOfflineSongRecords(next);
}
