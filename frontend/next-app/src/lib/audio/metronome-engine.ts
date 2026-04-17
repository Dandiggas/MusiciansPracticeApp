export interface MetronomeOptions {
  bpm: number;
  beatsPerMeasure: number;
  onBeat?: (beatNumber: number) => void;
}

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private masterVolume: number = 0.8;

  private bpm: number;
  private beatsPerMeasure: number;
  private onBeat?: (beatNumber: number) => void;

  private readonly SCHEDULE_AHEAD_TIME = 0.1;
  private readonly LOOKAHEAD = 25;
  private readonly MASTER_RAMP_TIME = 0.015; // 15 ms — fast enough to feel instant while dragging the volume slider, slow enough to prevent audible zipper noise from direct gain.value writes.

  constructor(options: MetronomeOptions) {
    this.bpm = options.bpm;
    this.beatsPerMeasure = options.beatsPerMeasure;
    this.onBeat = options.onBeat;
  }

  start(): void {
    if (this.isPlaying) return;
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.masterVolume * this.masterVolume;
    this.masterGain.connect(this.audioContext.destination);
    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext.currentTime;
    this.schedule();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  setBeatsPerMeasure(beats: number): void {
    this.beatsPerMeasure = beats;
    this.currentBeat = 0;
  }

  setOnBeat(callback: (beatNumber: number) => void): void {
    this.onBeat = callback;
  }

  setVolume(v: number): void {
    // Defend against NaN/Infinity from hand-edited localStorage or caller bugs —
    // AudioParam.gain.value = NaN throws / produces undefined behavior depending on browser.
    const safe = Number.isFinite(v) ? v : 0;
    const clamped = Math.min(1, Math.max(0, safe));
    this.masterVolume = clamped;
    if (this.audioContext && this.masterGain) {
      const target = clamped * clamped;
      const now = this.audioContext.currentTime;
      // Anchor the ramp with an explicit setValueAtTime. linearRampToValueAtTime ramps from
      // the value of the previous scheduled event — without this anchor, a bare `.gain.value = v`
      // write (done in start()) isn't an event-list entry, and the ramp start-time is
      // implementation-defined (historically buggy on older Safari).
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + this.MASTER_RAMP_TIME);
    }
  }

  private schedule(): void {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.SCHEDULE_AHEAD_TIME) {
      this.playClick(this.nextNoteTime, this.currentBeat === 0);
      this.onBeat?.(this.currentBeat);
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
      this.nextNoteTime += 60.0 / this.bpm;
    }

    this.timerId = setTimeout(() => this.schedule(), this.LOOKAHEAD);
  }

  private playClick(time: number, isAccent: boolean): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    // masterGain is non-null whenever isPlaying is true (start() assigns it before
    // setting isPlaying, and stop() clears isPlaying before nulling it). The ??
    // fallback exists purely to satisfy the type checker, which can't prove the
    // invariant through the setTimeout → schedule → playClick indirection.
    gain.connect(this.masterGain ?? this.audioContext.destination);

    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.value = isAccent ? 1.0 : 0.5;

    osc.start(time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.stop(time + 0.05);
  }
}
