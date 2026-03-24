"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface LoopableMediaController {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
}

interface ABLoopControlProps {
  getController: () => LoopableMediaController | null;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ABLoopControl({ getController }: ABLoopControlProps) {
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
      const controller = getController();
      if (!controller) return;

      const currentTime = controller.getCurrentTime();
      if (currentTime >= pointB!) {
        controller.seekTo(pointA!);
      }
    }, 200);

    return clearLoop;
  }, [pointA, pointB, isLooping, getController, clearLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return clearLoop;
  }, [clearLoop]);

  const handleSetA = () => {
    const controller = getController();
    if (!controller) return;
    const time = controller.getCurrentTime();
    setPointA(time);
    // If B is set and now A >= B, clear B
    if (pointB !== null && time >= pointB) {
      setPointB(null);
    }
  };

  const handleSetB = () => {
    const controller = getController();
    if (!controller) return;
    const time = controller.getCurrentTime();
    if (pointA !== null && time > pointA) {
      setPointB(time);
      controller.seekTo(pointA);
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
