export interface MetronomeOptions {
  bpm: number;
  beatsPerMeasure: number;
  volume?: number;
  onBeat?: (beatNumber: number) => void;
}

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private isPlaying: boolean = false;

  private bpm: number;
  private beatsPerMeasure: number;
  private volume: number;
  private onBeat?: (beatNumber: number) => void;

  private readonly SCHEDULE_AHEAD_TIME = 0.1;
  private readonly LOOKAHEAD = 25;

  constructor(options: MetronomeOptions) {
    this.bpm = options.bpm;
    this.beatsPerMeasure = options.beatsPerMeasure;
    this.volume = options.volume ?? 0.9;
    this.onBeat = options.onBeat;
  }

  start(): void {
    if (this.isPlaying) return;
    this.audioContext = new AudioContext();
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

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setOnBeat(callback: (beatNumber: number) => void): void {
    this.onBeat = callback;
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
    const clickVolume = isAccent ? this.volume : this.volume * 0.6;

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.setValueAtTime(clickVolume, time);

    osc.start(time);
    if (clickVolume > 0) {
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    } else {
      gain.gain.linearRampToValueAtTime(0, time + 0.05);
    }
    osc.stop(time + 0.05);
  }
}
