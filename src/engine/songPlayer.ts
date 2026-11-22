import { FluxSong } from '../types/flux';
import { fluxAudio } from './audioEngine';
import { getOfflineSongBlob } from './offlineAudioStore';

export interface SongPlaybackCallbacks {
  onProgress: (elapsedSec: number, durationSec: number) => void;
  onStepPulse?: (freqHz: number, song: FluxSong) => void;
  onSongEnded: () => void;
}

class FluxSongPlayer {
  private timerId: number | null = null;
  private startPerfMs = 0;
  private elapsedBeforePause = 0;
  private stepIdx = 0;
  private lastStepPerf = 0;
  private audioEl: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;

  private adTimerId: number | null = null;

  public async startSong(
    song: FluxSong,
    startOffsetSec: number,
    callbacks: SongPlaybackCallbacks
  ): Promise<'offline-wav' | 'live-synth'> {
    this.stopSong();
    this.elapsedBeforePause = startOffsetSec;
    this.startPerfMs = performance.now();
    this.lastStepPerf = performance.now();
    this.stepIdx = 0;

    // Prefer cached offline WAV blob if saved in IndexedDB
    const offlineBlob = await getOfflineSongBlob(song.id);
    if (offlineBlob) {
      const url = URL.createObjectURL(offlineBlob);
      this.activeObjectUrl = url;
      const audio = new Audio(url);
      audio.currentTime = Math.min(song.durationSec - 0.5, startOffsetSec);
      this.audioEl = audio;

      audio.onended = () => {
        this.stopSong();
        callbacks.onSongEnded();
      };
      void audio.play().catch(() => {
        // Fallback if autoplay blocked
      });

      this.timerId = window.setInterval(() => {
        const current = audio.currentTime || 0;
        callbacks.onProgress(current, song.durationSec);
      }, 180);

      return 'offline-wav';
    }

    // Live Web Audio harmonic sequencer
    const stepMs = (60 / song.bpm) * 1000;
    const initialFreq = song.scaleFreqs[0];
    fluxAudio.triggerNote(initialFreq, 'sine');
    callbacks.onStepPulse?.(initialFreq, song);

    this.timerId = window.setInterval(() => {
      const now = performance.now();
      const elapsed = this.elapsedBeforePause + (now - this.startPerfMs) / 1000;

      if (elapsed >= song.durationSec) {
        callbacks.onProgress(song.durationSec, song.durationSec);
        this.stopSong();
        callbacks.onSongEnded();
        return;
      }

      callbacks.onProgress(elapsed, song.durationSec);

      if (now - this.lastStepPerf >= stepMs) {
        this.lastStepPerf = now;
        this.stepIdx++;
        const freq =
          song.scaleFreqs[(this.stepIdx * 3 + (this.stepIdx % 2)) % song.scaleFreqs.length];
        fluxAudio.triggerNote(freq, this.stepIdx % 2 === 0 ? 'sine' : 'triangle');
        callbacks.onStepPulse?.(freq, song);
      }
    }, 120);

    return 'live-synth';
  }

  public stopSong(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.onended = null;
      this.audioEl = null;
    }
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  public playVoiceAd(
    onTick: (remainingSec: number) => void,
    onComplete: () => void
  ): void {
    this.stopVoiceAd();

    // Soft Web Audio chime signaling ad break
    fluxAudio.triggerNote(392.0, 'triangle');
    window.setTimeout(() => fluxAudio.triggerNote(523.25, 'sine'), 180);

    const adText =
      'You have listened to 5 free songs on Flux. Upgrade to Flux Premium to remove voice ads, unlock unlimited saved configurations, and save songs offline anytime.';

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(adText);
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Continue with deterministic timer fallback
      }
    }

    let remaining = 7;
    onTick(remaining);
    this.adTimerId = window.setInterval(() => {
      remaining -= 1;
      onTick(Math.max(0, remaining));
      if (remaining <= 0) {
        this.stopVoiceAd();
        onComplete();
      }
    }, 1000);
  }

  public stopVoiceAd(): void {
    if (this.adTimerId !== null) {
      window.clearInterval(this.adTimerId);
      this.adTimerId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const fluxSongPlayer = new FluxSongPlayer();
