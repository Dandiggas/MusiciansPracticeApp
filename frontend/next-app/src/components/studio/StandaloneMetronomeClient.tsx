"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import MetronomeWidget from "@/components/studio/MetronomeWidget";
import { Button } from "@/components/ui/button";
import { MetronomeEngine } from "@/lib/audio/metronome-engine";


export function StandaloneMetronomeClient() {
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(0.9);
  const [isActive, setIsActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [, setTapTimes] = useState<number[]>([]);
  const metronomeRef = useRef<MetronomeEngine | null>(null);

  useEffect(() => {
    return () => {
      metronomeRef.current?.stop();
      metronomeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(bpm);
    }
  }, [bpm]);

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBeatsPerMeasure(beatsPerMeasure);
    }
  }, [beatsPerMeasure]);

  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setVolume(volume);
    }
  }, [volume]);

  function handleToggle() {
    if (isActive) {
      metronomeRef.current?.stop();
      metronomeRef.current = null;
      setCurrentBeat(-1);
      setIsActive(false);
      return;
    }

    const engine = new MetronomeEngine({
      bpm,
      beatsPerMeasure,
      volume,
      onBeat: setCurrentBeat,
    });
    engine.start();
    metronomeRef.current = engine;
    setIsActive(true);
  }

  function handleTapTempo() {
    const now = Date.now();
    setTapTimes((current) => {
      const next = [...current.slice(-4), now];
      if (next.length >= 2) {
        const intervals = next.slice(1).map((time, index) => time - next[index]);
        const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        setBpm(Math.max(20, Math.min(300, Math.round(60000 / average))));
      }
      return next;
    });
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Standalone tool
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
            Keep the click ready.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Use the metronome on its own when you just need the click. The same
            tool also lives inside each session now, so you can keep tempo
            control beside the tracks you are practising.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sessions">Back to sessions</Link>
            </Button>
          </div>
        </div>

        <MetronomeWidget
          bpm={bpm}
          isActive={isActive}
          currentBeat={currentBeat}
          beatsPerMeasure={beatsPerMeasure}
          volume={volume}
          onBpmChange={setBpm}
          onBeatsPerMeasureChange={setBeatsPerMeasure}
          onVolumeChange={setVolume}
          onToggle={handleToggle}
          onTapTempo={handleTapTempo}
        />
      </div>
    </div>
  );
}
