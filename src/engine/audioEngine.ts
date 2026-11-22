// Web Audio API synthesizer for interactive harmonic triggers and live field sonification

export interface HarmonicTriggerDef {
  id: string;
  label: string;
  note: string;
  freqHz: number;
  waveform: OscillatorType;
  accent: 'cyan' | 'amber' | 'sky' | 'emerald';
}

export const HARMONIC_TRIGGERS: HarmonicTriggerDef[] = [
  { id: 'c3', label: 'Sub', note: 'C3', freqHz: 130.81, waveform: 'sine', accent: 'cyan' },
  { id: 'g3', label: 'Fifth', note: 'G3', freqHz: 196.0, waveform: 'triangle', accent: 'sky' },
  { id: 'b3', label: 'Maj7', note: 'B3', freqHz: 246.94, waveform: 'sine', accent: 'emerald' },
  { id: 'd4', label: 'Ninth', note: 'D4', freqHz: 293.66, waveform: 'triangle', accent: 'amber' },
  { id: 'e4', label: 'Third', note: 'E4', freqHz: 329.63, waveform: 'sine', accent: 'cyan' },
];

class FluxAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private sonificationActive = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.42;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public triggerNote(freqHz: number, waveform: OscillatorType = 'sine'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();

    osc1.type = waveform;
    osc1.frequency.setValueAtTime(freqHz, now);

    // Subtle harmonic overtone voice (+1 octave, slightly detuned)
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freqHz * 2.003, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3200, freqHz * 6), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, freqHz * 1.4), now + 1.1);
    filter.Q.value = 2.4;

    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.32, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

    const overtoneGain = ctx.createGain();
    overtoneGain.gain.value = 0.25;

    osc1.connect(filter);
    osc2.connect(overtoneGain);
    overtoneGain.connect(filter);

    filter.connect(env);
    env.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);
  }

  public setSonification(enabled: boolean): void {
    this.sonificationActive = enabled;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    if (enabled) {
      if (!this.droneOscA || !this.droneOscB || !this.droneGain || !this.droneFilter) {
        this.droneFilter = ctx.createBiquadFilter();
        this.droneFilter.type = 'lowpass';
        this.droneFilter.frequency.value = 340;
        this.droneFilter.Q.value = 1.6;

        this.droneGain = ctx.createGain();
        this.droneGain.gain.setValueAtTime(0.0001, now);

        this.droneOscA = ctx.createOscillator();
        this.droneOscA.type = 'triangle';
        this.droneOscA.frequency.value = 130.81; // C3

        this.droneOscB = ctx.createOscillator();
        this.droneOscB.type = 'sine';
        this.droneOscB.frequency.value = 196.0; // G3

        this.droneOscA.connect(this.droneFilter);
        this.droneOscB.connect(this.droneFilter);
        this.droneFilter.connect(this.droneGain);
        this.droneGain.connect(this.masterGain);

        this.droneOscA.start(now);
        this.droneOscB.start(now);
      }

      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setTargetAtTime(0.16, now, 0.08);
    } else if (this.droneGain) {
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setTargetAtTime(0.0001, now, 0.08);
    }
  }

  public updateFieldModulation(meanSpeed: number, meanCurl: number): void {
    if (!this.sonificationActive || !this.ctx || !this.droneFilter || !this.droneOscB) {
      return;
    }
    const now = this.ctx.currentTime;
    const cutoff = Math.min(1800, 220 + meanSpeed * 280 + meanCurl * 65);
    this.droneFilter.frequency.setTargetAtTime(cutoff, now, 0.09);

    // Subtle harmonic detune drift proportional to vorticity
    const fifthFreq = 196.0 + Math.min(18, meanCurl * 1.8);
    this.droneOscB.frequency.setTargetAtTime(fifthFreq, now, 0.12);
  }
}

export const fluxAudio = new FluxAudioEngine();
