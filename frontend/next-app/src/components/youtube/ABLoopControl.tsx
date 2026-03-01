"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ABLoopControlProps {
  getPlayer: () => YT.Player | null;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ABLoopControl({ getPlayer }: ABLoopControlProps) {
  const [pointA, setPointA] = useState<number | null>(null);
  const [pointB, setPointB] = useState<number | null>(null);
  const loopIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isLooping = pointA !== null && pointB !== null;

  const clearLoop = useCallback(() => {
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
  }, []);

  // Polling loop: check current time and seek back to A when past B
  useEffect(() => {
    if (!isLooping) {
      clearLoop();
      return;
    }

    loopIntervalRef.current = setInterval(() => {
      const player = getPlayer();
      if (!player) return;

      const currentTime = player.getCurrentTime();
      if (currentTime >= pointB!) {
        player.seekTo(pointA!, true);
      }
    }, 200);

    return clearLoop;
  }, [pointA, pointB, isLooping, getPlayer, clearLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return clearLoop;
  }, [clearLoop]);

  const handleSetA = () => {
    const player = getPlayer();
    if (!player) return;
    const time = player.getCurrentTime();
    setPointA(time);
    // If B is set and now A >= B, clear B
    if (pointB !== null && time >= pointB) {
      setPointB(null);
    }
  };

  const handleSetB = () => {
    const player = getPlayer();
    if (!player) return;
    const time = player.getCurrentTime();
    if (pointA !== null && time > pointA) {
      setPointB(time);
      // Immediately seek to A to start the loop
      player.seekTo(pointA, true);
    }
  };

  const handleClear = () => {
    setPointA(null);
    setPointB(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">A-B Loop</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={pointA !== null ? 'default' : 'outline'}
          size="sm"
          onClick={handleSetA}
        >
          {pointA !== null ? `A: ${formatTimestamp(pointA)}` : 'Set A'}
        </Button>
        <Button
          variant={pointB !== null ? 'default' : 'outline'}
          size="sm"
          onClick={handleSetB}
          disabled={pointA === null}
        >
          {pointB !== null ? `B: ${formatTimestamp(pointB)}` : 'Set B'}
        </Button>
        {pointA !== null && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
      {isLooping && (
        <Badge variant="secondary" className="text-xs">
          Looping {formatTimestamp(pointA!)} &rarr; {formatTimestamp(pointB!)}
        </Badge>
      )}
    </div>
  );
}
