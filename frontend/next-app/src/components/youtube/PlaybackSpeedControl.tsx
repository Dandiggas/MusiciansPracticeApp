"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

interface PlaybackSpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export default function PlaybackSpeedControl({
  currentSpeed,
  onSpeedChange,
}: PlaybackSpeedControlProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Playback Speed</p>
      <div className="flex flex-wrap gap-1.5">
        {SPEEDS.map((speed) => (
          <Button
            key={speed}
            variant={currentSpeed === speed ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSpeedChange(speed)}
            className="min-w-[3.5rem] text-xs"
          >
            {speed === 1 ? '1x' : `${speed}x`}
          </Button>
        ))}
      </div>
    </div>
  );
}
