"use client";

import React from "react";

interface SessionPerformanceProps {
  elapsedSeconds: number;
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function SessionPerformance({ elapsedSeconds }: SessionPerformanceProps) {
  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Session Performance
      </p>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Accuracy</span>
          <span className="text-sm font-semibold text-foreground">--</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Active Time</span>
          <span className="text-sm font-mono font-semibold text-foreground">{formatTime(elapsedSeconds)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Repetitions</span>
          <span className="text-sm font-semibold text-foreground">--</span>
        </div>
      </div>
    </div>
  );
}
