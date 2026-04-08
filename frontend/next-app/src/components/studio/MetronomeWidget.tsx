"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "@phosphor-icons/react";

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
  onBpmChange: (bpm: number) => void;
  onBeatsPerMeasureChange: (beats: number) => void;
  onToggle: () => void;
  onTapTempo: () => void;
}

export default function MetronomeWidget({
  bpm,
  isActive,
  currentBeat,
  beatsPerMeasure,
  onBpmChange,
  onBeatsPerMeasureChange,
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
        <div className="text-6xl font-extrabold tracking-tight text-foreground">
          {bpm}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mt-1">
          BPM
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleBpmChange(bpm - 1)}>
          <Minus size={16} weight="regular" />
        </Button>
        <input
          type="range"
          min={20}
          max={300}
          value={bpm}
          onChange={(e) => handleBpmChange(Number(e.target.value))}
          className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
        />
        <Button variant="secondary" size="icon" className="rounded-lg h-9 w-9" onClick={() => handleBpmChange(bpm + 1)}>
          <Plus size={16} weight="regular" />
        </Button>
      </div>

      <div className="flex justify-center gap-2 py-2">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-colors duration-75 ${
              currentBeat === i
                ? i === 0
                  ? "bg-accent scale-125"
                  : "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIME_SIGNATURES.map((ts) => (
          <Button
            key={ts.label}
            variant={beatsPerMeasure === ts.beats ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-8"
            onClick={() => onBeatsPerMeasureChange(ts.beats)}
          >
            {ts.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onToggle}
          className={`flex-1 h-10 rounded-lg font-semibold ${
            isActive
              ? "bg-destructive text-white hover:bg-destructive/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isActive ? "Stop" : "Start Click"}
        </Button>
        <Button variant="secondary" className="rounded-lg h-10" onClick={onTapTempo}>
          Tap
        </Button>
      </div>
    </div>
  );
}
