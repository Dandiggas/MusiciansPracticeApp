"use client";

import { Pause, Play } from "@phosphor-icons/react";

import { Transport } from "@/hooks/transport";
import { Button } from "@/components/ui/button";


function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

interface TransportControlsProps {
  transport: Transport;
  speed: number;
  speedMax: number;
  speedMin: number;
  speedStep: number;
  onSpeedChange: (speed: number) => void;
}

export function TransportControls({
  transport,
  speed,
  speedMax,
  speedMin,
  speedStep,
  onSpeedChange,
}: TransportControlsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            if (transport.isPlaying) {
              transport.pause();
            } else {
              void transport.play();
            }
          }}
        >
          {transport.isPlaying ? (
            <>
              <Pause size={16} weight="fill" />
              Pause
            </>
          ) : (
            <>
              <Play size={16} weight="fill" />
              Play
            </>
          )}
        </Button>

        <div className="flex min-w-[180px] flex-1 flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>{formatTime(transport.currentTime)}</span>
            <span>{formatTime(transport.duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(transport.duration, 0)}
            step={0.01}
            value={Math.min(transport.currentTime, Math.max(transport.duration, 0))}
            onChange={(event) => transport.seek(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>

        <div className="w-full min-w-[220px] flex-1 md:max-w-[260px]">
          <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>Speed</span>
            <span>{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={speedMin}
            max={speedMax}
            step={speedStep}
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>
      </div>

      {transport.error ? (
        <p className="text-sm text-destructive">{transport.error}</p>
      ) : null}
    </div>
  );
}
