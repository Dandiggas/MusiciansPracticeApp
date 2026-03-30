# Metronome & Tuner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a metronome and chromatic tuner to the Musicians Practice App as two new pages.

**Architecture:** Both features are purely client-side using the Web Audio API — no backend changes needed. The metronome uses an OscillatorNode to generate click sounds on a scheduled interval. The tuner uses getUserMedia for microphone access and an autocorrelation-based pitch detection algorithm running on AnalyserNode data. Shared audio utilities live in `src/lib/audio/`.

**Tech Stack:** Web Audio API, React hooks, TypeScript, Tailwind CSS, lucide-react icons, existing Card/Button UI components.

---

## File Structure

```
src/
├── lib/audio/
│   ├── metronome-engine.ts      # Web Audio metronome scheduler (oscillator + timing)
│   ├── pitch-detector.ts        # Autocorrelation pitch detection algorithm
│   └── note-utils.ts            # Frequency-to-note conversion, cents calculation
├── app/
│   ├── metronome/
│   │   └── page.tsx             # Metronome page component
│   └── tuner/
│       └── page.tsx             # Tuner page component
├── components/navigation/
│   ├── Header.tsx               # MODIFY: add Metronome + Tuner nav links
│   └── MobileNav.tsx            # MODIFY: add Metronome + Tuner nav links
```

---

### Task 1: Audio utility — note-utils.ts

**Files:**
- Create: `frontend/next-app/src/lib/audio/note-utils.ts`

- [ ] **Step 1: Create note-utils.ts with frequency/note conversion**

```typescript
// src/lib/audio/note-utils.ts

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface NoteInfo {
  name: string;
  octave: number;
  frequency: number;
  cents: number;
}

/**
 * Convert a frequency (Hz) to the nearest note with cents offset.
 * Uses A4 = referenceFreq (default 440Hz) as the reference.
 */
export function frequencyToNote(frequency: number, referenceFreq: number = 440): NoteInfo {
  // Number of semitones from A4
  const semitones = 12 * Math.log2(frequency / referenceFreq);
  const roundedSemitones = Math.round(semitones);
  const cents = Math.round((semitones - roundedSemitones) * 100);

  // A4 is MIDI note 69 → noteIndex 69
  const midiNote = 69 + roundedSemitones;
  const name = NOTE_NAMES[((midiNote % 12) + 12) % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  const exactFrequency = referenceFreq * Math.pow(2, roundedSemitones / 12);

  return { name, octave, frequency: exactFrequency, cents };
}

/**
 * Get the frequency of a note by name and octave.
 */
export function noteToFrequency(name: string, octave: number, referenceFreq: number = 440): number {
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) throw new Error(`Unknown note: ${name}`);
  const midiNote = (octave + 1) * 12 + noteIndex;
  const semitonesFromA4 = midiNote - 69;
  return referenceFreq * Math.pow(2, semitonesFromA4 / 12);
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls frontend/next-app/src/lib/audio/note-utils.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/lib/audio/note-utils.ts
git commit -m "feat: add note/frequency conversion utilities"
```

---

### Task 2: Audio utility — pitch-detector.ts

**Files:**
- Create: `frontend/next-app/src/lib/audio/pitch-detector.ts`

- [ ] **Step 1: Create pitch-detector.ts with autocorrelation algorithm**

```typescript
// src/lib/audio/pitch-detector.ts

/**
 * Detect the fundamental frequency of a signal using autocorrelation.
 * Returns the detected frequency in Hz, or null if no clear pitch is found.
 *
 * @param buffer - Float32Array of audio samples
 * @param sampleRate - The audio sample rate (e.g., 44100)
 * @param minFreq - Minimum detectable frequency (default 60Hz — roughly B1)
 * @param maxFreq - Maximum detectable frequency (default 1500Hz — roughly F#6)
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 60,
  maxFreq: number = 1500
): number | null {
  const bufferLength = buffer.length;

  // Check if signal is loud enough (RMS)
  let rms = 0;
  for (let i = 0; i < bufferLength; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.01) return null; // Too quiet

  // Autocorrelation
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);

  let bestCorrelation = -1;
  let bestPeriod = -1;

  for (let period = minPeriod; period <= maxPeriod && period < bufferLength; period++) {
    let correlation = 0;
    for (let i = 0; i < bufferLength - period; i++) {
      correlation += buffer[i] * buffer[i + period];
    }
    // Normalize
    correlation /= (bufferLength - period);

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestPeriod = period;
    }
  }

  if (bestPeriod === -1 || bestCorrelation < 0.01) return null;

  // Parabolic interpolation for sub-sample accuracy
  const prev = autocorrelationAt(buffer, bestPeriod - 1);
  const curr = autocorrelationAt(buffer, bestPeriod);
  const next = autocorrelationAt(buffer, bestPeriod + 1);

  const shift = (prev - next) / (2 * (prev - 2 * curr + next));
  const refinedPeriod = bestPeriod + (isFinite(shift) ? shift : 0);

  return sampleRate / refinedPeriod;
}

function autocorrelationAt(buffer: Float32Array, period: number): number {
  let sum = 0;
  for (let i = 0; i < buffer.length - period; i++) {
    sum += buffer[i] * buffer[i + period];
  }
  return sum / (buffer.length - period);
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls frontend/next-app/src/lib/audio/pitch-detector.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/lib/audio/pitch-detector.ts
git commit -m "feat: add autocorrelation pitch detection algorithm"
```

---

### Task 3: Audio utility — metronome-engine.ts

**Files:**
- Create: `frontend/next-app/src/lib/audio/metronome-engine.ts`

- [ ] **Step 1: Create metronome-engine.ts with Web Audio scheduler**

The metronome uses the "scheduling ahead" pattern: a setTimeout loop schedules oscillator clicks into the Web Audio timeline ahead of time for rock-solid timing.

```typescript
// src/lib/audio/metronome-engine.ts

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

  private bpm: number;
  private beatsPerMeasure: number;
  private onBeat?: (beatNumber: number) => void;

  // Scheduling constants
  private readonly SCHEDULE_AHEAD_TIME = 0.1; // seconds
  private readonly LOOKAHEAD = 25; // milliseconds

  constructor(options: MetronomeOptions) {
    this.bpm = options.bpm;
    this.beatsPerMeasure = options.beatsPerMeasure;
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

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    // Accent beat: higher pitch and louder
    osc.frequency.value = isAccent ? 1000 : 800;
    gain.gain.value = isAccent ? 1.0 : 0.5;

    // Short click envelope
    osc.start(time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.stop(time + 0.05);
  }
}
```

- [ ] **Step 2: Verify file was created**

Run: `ls frontend/next-app/src/lib/audio/metronome-engine.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/lib/audio/metronome-engine.ts
git commit -m "feat: add Web Audio metronome engine with schedule-ahead timing"
```

---

### Task 4: Metronome page

**Files:**
- Create: `frontend/next-app/src/app/metronome/page.tsx`

- [ ] **Step 1: Create the metronome page component**

```tsx
// src/app/metronome/page.tsx
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Square, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetronomeEngine } from "@/lib/audio/metronome-engine";

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
];

export default function MetronomePage() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  const engineRef = useRef<MetronomeEngine | null>(null);

  const handleBeatCallback = useCallback((beat: number) => {
    setCurrentBeat(beat);
  }, []);

  const handleStart = useCallback(() => {
    const engine = new MetronomeEngine({
      bpm,
      beatsPerMeasure,
      onBeat: handleBeatCallback,
    });
    engineRef.current = engine;
    engine.start();
    setIsPlaying(true);
  }, [bpm, beatsPerMeasure, handleBeatCallback]);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  // Update engine BPM when slider/input changes during playback
  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    engineRef.current?.setBeatsPerMeasure(beatsPerMeasure);
  }, [beatsPerMeasure]);

  // Keep onBeat callback in sync
  useEffect(() => {
    engineRef.current?.setOnBeat(handleBeatCallback);
  }, [handleBeatCallback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const handleBpmChange = (value: number) => {
    const clamped = Math.max(20, Math.min(300, value));
    setBpm(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    setTapTimes((prev) => {
      const recent = [...prev, now].filter((t) => now - t < 3000);
      if (recent.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recent.length; i++) {
          intervals.push(recent[i] - recent[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const tappedBpm = Math.round(60000 / avgInterval);
        handleBpmChange(tappedBpm);
      }
      return recent;
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Metronome</h1>
        <p className="text-muted-foreground mt-2">Keep perfect time while you practice</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tempo</CardTitle>
            <CardDescription>Adjust BPM and time signature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* BPM Display */}
            <div className="text-center">
              <div className="text-7xl font-bold font-mono">{bpm}</div>
              <p className="text-sm text-muted-foreground mt-1">BPM</p>
            </div>

            {/* BPM Controls */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleBpmChange(bpm - 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleBpmChange(bpm + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* BPM Input */}
            <div className="flex items-center gap-3">
              <Label htmlFor="bpm-input" className="shrink-0">
                BPM:
              </Label>
              <Input
                id="bpm-input"
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-24"
              />
              <Button variant="secondary" onClick={handleTapTempo}>
                Tap Tempo
              </Button>
            </div>

            {/* Time Signature */}
            <div className="space-y-2">
              <Label>Time Signature</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_SIGNATURES.map((ts) => (
                  <Button
                    key={ts.label}
                    variant={beatsPerMeasure === ts.beats ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBeatsPerMeasure(ts.beats)}
                  >
                    {ts.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Beat Indicators */}
            <div className="flex justify-center gap-3 py-4">
              {Array.from({ length: beatsPerMeasure }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-colors duration-100",
                    currentBeat === i
                      ? i === 0
                        ? "bg-primary border-primary scale-110"
                        : "bg-secondary border-secondary"
                      : "border-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Start/Stop */}
            <Button
              onClick={isPlaying ? handleStop : handleStart}
              className="w-full"
              size="lg"
              variant={isPlaying ? "destructive" : "default"}
            >
              {isPlaying ? (
                <>
                  <Square className="mr-2 h-5 w-5" /> Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" /> Start
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metronome`
Expected: 200

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/metronome/page.tsx
git commit -m "feat: add metronome page with BPM control, tap tempo, and time signatures"
```

---

### Task 5: Tuner page

**Files:**
- Create: `frontend/next-app/src/app/tuner/page.tsx`

- [ ] **Step 1: Create the tuner page component**

```tsx
// src/app/tuner/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";

export default function TunerPage() {
  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState<NoteInfo | null>(null);
  const [referenceFreq, setReferenceFreq] = useState(440);
  const [error, setError] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const frequency = detectPitch(buffer, audioContextRef.current.sampleRate);

    if (frequency !== null) {
      setNote(frequencyToNote(frequency, referenceFreq));
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, [referenceFreq]);

  const startListening = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      rafRef.current = requestAnimationFrame(analyze);
    } catch {
      setError("Could not access microphone. Please allow microphone permissions.");
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setNote(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Gauge position: cents ranges from -50 to +50, map to 0-100%
  const gaugePercent = note ? Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100)) : 50;
  const isInTune = note !== null && Math.abs(note.cents) <= 5;
  const isClose = note !== null && Math.abs(note.cents) <= 15;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tuner</h1>
        <p className="text-muted-foreground mt-2">Tune your instrument with your microphone</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chromatic Tuner</CardTitle>
            <CardDescription>Play a note and see how close you are</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Note Display */}
            <div className="text-center py-4">
              <div
                className={cn(
                  "text-8xl font-bold font-mono transition-colors",
                  !note && "text-muted-foreground/30",
                  note && isInTune && "text-green-500",
                  note && !isInTune && isClose && "text-yellow-500",
                  note && !isInTune && !isClose && "text-red-500"
                )}
              >
                {note ? `${note.name}${note.octave}` : "--"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {note
                  ? `${note.frequency.toFixed(1)} Hz`
                  : isListening
                    ? "Play a note..."
                    : "Press Start to begin"}
              </p>
            </div>

            {/* Cents Gauge */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Flat</span>
                <span>In Tune</span>
                <span>Sharp</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-500 z-10" />
                {/* Needle */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 -translate-x-1/2",
                    isInTune
                      ? "bg-green-500"
                      : isClose
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  )}
                  style={{ left: `${gaugePercent}%` }}
                />
              </div>
              <div className="text-center text-lg font-mono">
                {note ? `${note.cents > 0 ? "+" : ""}${note.cents} cents` : "-- cents"}
              </div>
            </div>

            {/* Reference Frequency */}
            <div className="flex items-center gap-3">
              <Label htmlFor="ref-freq" className="shrink-0">
                A4 =
              </Label>
              <Input
                id="ref-freq"
                type="number"
                min={420}
                max={460}
                value={referenceFreq}
                onChange={(e) => setReferenceFreq(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">Hz</span>
            </div>

            {error && (
              <div className="text-sm font-medium text-destructive text-center">{error}</div>
            )}

            {/* Start/Stop */}
            <Button
              onClick={isListening ? stopListening : startListening}
              className="w-full"
              size="lg"
              variant={isListening ? "destructive" : "default"}
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" /> Stop Tuner
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" /> Start Tuner
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tuner`
Expected: 200

- [ ] **Step 3: Commit**

```bash
git add frontend/next-app/src/app/tuner/page.tsx
git commit -m "feat: add chromatic tuner page with mic input and pitch detection"
```

---

### Task 6: Add navigation links

**Files:**
- Modify: `frontend/next-app/src/components/navigation/Header.tsx:14-21`
- Modify: `frontend/next-app/src/components/navigation/MobileNav.tsx:14-21`

- [ ] **Step 1: Add Metronome and Tuner to Header navigation array**

In `Header.tsx`, add these two entries to the `navigation` array, after the "Practice Timer" entry:

```typescript
    { name: "Metronome", href: "/metronome" },
    { name: "Tuner", href: "/tuner" },
```

- [ ] **Step 2: Add Metronome and Tuner to MobileNav navigation array**

In `MobileNav.tsx`, add the same two entries to the `navigation` array, after the "Practice Timer" entry:

```typescript
    { name: "Metronome", href: "/metronome" },
    { name: "Tuner", href: "/tuner" },
```

- [ ] **Step 3: Verify navigation renders**

Run: `curl -s http://localhost:3000/ | grep -o 'Metronome\|Tuner'`
Expected: `Metronome` and `Tuner` appear in output

- [ ] **Step 4: Commit**

```bash
git add frontend/next-app/src/components/navigation/Header.tsx frontend/next-app/src/components/navigation/MobileNav.tsx
git commit -m "feat: add Metronome and Tuner to navigation"
```

---

### Task 7: Manual testing & final commit

- [ ] **Step 1: Verify all pages load without errors**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/metronome
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/tuner
```

Expected: Both return 200

- [ ] **Step 2: Check Next.js dev server logs for errors**

Verify no SSR errors, no TypeScript errors, no import errors in the terminal running `npm run dev`.

- [ ] **Step 3: Open in browser and manually test**

- Metronome: Start/stop, change BPM, tap tempo, change time signature, verify beat indicators animate
- Tuner: Start, allow microphone, play a note, verify note name + cents display, verify gauge moves, stop
