"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import type { NoteInfo } from "@/lib/audio/note-utils";

interface TunerWidgetProps {
  isActive: boolean;
  note: NoteInfo | null;
  error: string;
  onToggle: () => void;
}

export default function TunerWidget({
  isActive,
  note,
  error,
  onToggle,
}: TunerWidgetProps) {
  const gaugePercent = note
    ? Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100))
    : 50;
  const isInTune = note !== null && Math.abs(note.cents) <= 5;
  const isClose = note !== null && Math.abs(note.cents) <= 15;

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Precision Tuner
      </p>

      <div className="text-center py-2">
        <span
          className={`text-5xl font-mono font-bold tracking-tighter transition-colors ${
            !note
              ? "text-muted-foreground/30"
              : isInTune
                ? "text-accent"
                : isClose
                  ? "text-yellow-400"
                  : "text-destructive"
          }`}
        >
          {note ? `${note.name}${note.octave}` : "--"}
        </span>
        <p className="mt-1">
          {note
            ? <span className="text-sm font-mono text-muted-foreground tabular-nums">{note.frequency.toFixed(1)} Hz</span>
            : <span className="text-xs text-muted-foreground">{isActive ? "Play a note..." : "Start to tune"}</span>}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>Flat</span>
          <span>In Tune</span>
          <span>Sharp</span>
        </div>
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-accent z-10" />
          <div
            className={`absolute top-0 bottom-0 w-2 rounded-full -translate-x-1/2 ${
              isInTune ? "bg-accent" : isClose ? "bg-yellow-400" : "bg-destructive"
            }`}
            style={{
              left: `${gaugePercent}%`,
              transition: "left 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        </div>
        <div className="text-center text-sm font-mono text-foreground">
          {note ? `${note.cents > 0 ? "+" : ""}${note.cents} cents` : "-- cents"}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        onClick={onToggle}
        className={`w-full h-10 rounded-lg font-semibold ${
          isActive
            ? "bg-destructive text-white hover:bg-destructive/90"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        {isActive ? (
          <><MicrophoneSlash size={20} weight="regular" className="mr-1.5" /> Stop</>
        ) : (
          <><Microphone size={20} weight="regular" className="mr-1.5" /> Start Tuner</>
        )}
      </Button>
    </div>
  );
}
