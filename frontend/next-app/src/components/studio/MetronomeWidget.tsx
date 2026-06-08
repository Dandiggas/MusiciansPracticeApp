"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "@phosphor-icons/react";
import { MotionDiv } from "@/components/ui/motion-wrapper";

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
];

interface MetronomeWidgetProps {
  bpm: number;
  isActive: boolean;
  currentBeat: number;
  beatsPerMeasure: number;
  volume: number;
  onBpmChange: (bpm: number) => void;
  onBeatsPerMeasureChange: (beats: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggle: () => void;
  onTapTempo: () => void;
}

export default function MetronomeWidget({
  bpm,
  isActive,
  currentBeat,
  beatsPerMeasure,
  volume,
  onBpmChange,
  onBeatsPerMeasureChange,
  onVolumeChange,
  onToggle,
  onTapTempo,
}: MetronomeWidgetProps) {
  const handleBpmChange = (value: number) => {
    onBpmChange(Math.max(20, Math.min(300, value)));
  };

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Metronome
      </p>

      <div className="text-center">
        <MotionDiv
          key={bpm}
          initial={{ scale: 1.08, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
          className="inline-block"
        >
          <span className="text-6xl font-mono font-bold tracking-tighter tabular-nums text-foreground">
            {bpm}
          </span>
        </MotionDiv>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mt-1">
          BPM
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-lg"
          aria-label="Decrease BPM"
          onClick={() => handleBpmChange(bpm - 1)}
        >
          <Minus size={16} weight="regular" />
        </Button>
        <input
          type="range"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          aria-label="BPM"
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-lg"
          aria-label="Increase BPM"
          onClick={() => handleBpmChange(bpm + 1)}
        >
          <Plus size={16} weight="regular" />
        </Button>
      </div>

      <div className="flex justify-center gap-2 py-2">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => {
          const isActiveBeat = currentBeat === i;
          return (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full ${
                isActiveBeat
                  ? i === 0
                    ? "bg-accent"
                    : "bg-primary"
                  : "bg-muted"
              }`}
              style={{
                transform: isActiveBeat ? "scale(1.25)" : "scale(1)",
                transition: "transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIME_SIGNATURES.map((ts) => (
          <Button
            key={ts.label}
            variant={beatsPerMeasure === ts.beats ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-8 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            onClick={() => onBeatsPerMeasureChange(ts.beats)}
          >
            {ts.label}
          </Button>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          <span>Volume</span>
          <span>{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          aria-label="Metronome volume"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        />
      </div>

      <div className="flex gap-2">
        <MotionDiv
          className="flex-1"
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.1, ease: [0.32, 0.72, 0, 1] }}
        >
          <Button
            onClick={onToggle}
            className={`w-full h-10 rounded-lg font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isActive
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isActive ? "Stop" : "Start Click"}
          </Button>
        </MotionDiv>
        <Button variant="secondary" className="rounded-lg h-10" onClick={onTapTempo}>
          Tap
        </Button>
      </div>
    </div>
  );
}
