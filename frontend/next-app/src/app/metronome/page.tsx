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

  useEffect(() => {
    engineRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    engineRef.current?.setBeatsPerMeasure(beatsPerMeasure);
  }, [beatsPerMeasure]);

  useEffect(() => {
    engineRef.current?.setOnBeat(handleBeatCallback);
  }, [handleBeatCallback]);

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
