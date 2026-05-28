export interface Transport {
  play(): Promise<void> | void;
  pause(): void;
  seek(seconds: number): void;
  setSpeed(rate: number): void;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  error: string | null;
}
