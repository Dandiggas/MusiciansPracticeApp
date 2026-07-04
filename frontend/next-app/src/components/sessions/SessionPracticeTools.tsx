"use client";

import { useEffect, useRef, useState } from "react";
import { Metronome, Microphone } from "@phosphor-icons/react";

import MetronomeWidget from "@/components/studio/MetronomeWidget";
import TunerWidget from "@/components/studio/TunerWidget";
import { Button } from "@/components/ui/button";
import { MetronomeEngine } from "@/lib/audio/metronome-engine";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";


type PracticeTool = "metronome" | "tuner";

interface SessionPracticeToolsProps {
  trackBpm: number | null;
  trackName: string | null;
}

export function SessionPracticeTools({
  trackBpm,
  trackName,
}: SessionPracticeToolsProps) {
  const [activeTool, setActiveTool] = useState<PracticeTool>("metronome");

  const [bpm, setBpm] = useState(trackBpm ?? 120);
  const [metronomeVolume, setMetronomeVolume] = useState(0.9);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [, setTapTimes] = useState<number[]>([]);
  const metronomeRef = useRef<MetronomeEngine | null>(null);

  const [isTunerActive, setIsTunerActive] = useState(false);
  const [note, setNote] = useState<NoteInfo | null>(null);
  const [tunerError, setTunerError] = useState("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (trackBpm !== null) {
      setBpm(trackBpm);
      setTapTimes([]);
    }
  }, [trackBpm, trackName]);

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
      metronomeRef.current.setVolume(metronomeVolume);
    }
  }, [metronomeVolume]);

  useEffect(() => {
    if (activeTool === "metronome") {
      stopTuner();
      return;
    }

    stopMetronome();
  }, [activeTool]);

  useEffect(() => {
    return () => {
      stopMetronome();
      stopTuner();
    };
  }, []);

  function stopMetronome() {
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    setCurrentBeat(-1);
    setIsMetronomeActive(false);
  }

  function handleMetronomeToggle() {
    if (isMetronomeActive) {
      stopMetronome();
      return;
    }

    const engine = new MetronomeEngine({
      bpm,
      beatsPerMeasure,
      volume: metronomeVolume,
      onBeat: setCurrentBeat,
    });
    engine.start();
    metronomeRef.current = engine;
    setIsMetronomeActive(true);
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

  function stopTuner() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsTunerActive(false);
    setNote(null);
    setTunerError("");
  }

  async function startTuner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setIsTunerActive(true);
      setTunerError("");

      const buffer = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current || !audioContextRef.current) {
          return;
        }

        analyserRef.current.getFloatTimeDomainData(buffer);
        const frequency = detectPitch(buffer, audioContextRef.current.sampleRate);
        setNote(frequency ? frequencyToNote(frequency) : null);
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setTunerError("Microphone access is required to use the tuner.");
      stopTuner();
    }
  }

  function handleTunerToggle() {
    if (isTunerActive) {
      stopTuner();
      return;
    }

    void startTuner();
  }

  return (
    <div className="space-y-3 xl:sticky xl:top-20">
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Practice tools
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep the click and tuner inside the session.
            </p>
          </div>
          {trackName ? (
            <div className="rounded-full bg-muted/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {trackBpm ? `${trackBpm} BPM loaded` : "No BPM yet"}
            </div>
          ) : null}
        </div>

        <p className="mt-3 truncate text-sm font-semibold text-foreground">
          {trackName ?? "No track selected"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeTool === "metronome" ? "selected" : "secondary"}
            className="w-full"
            onClick={() => setActiveTool("metronome")}
          >
            <Metronome size={16} weight="bold" />
            Metronome
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTool === "tuner" ? "selected" : "secondary"}
            className="w-full"
            onClick={() => setActiveTool("tuner")}
          >
            <Microphone size={16} weight="bold" />
            Tuner
          </Button>
        </div>
      </div>

      {activeTool === "metronome" ? (
        <MetronomeWidget
          bpm={bpm}
          isActive={isMetronomeActive}
          currentBeat={currentBeat}
          beatsPerMeasure={beatsPerMeasure}
          volume={metronomeVolume}
          onBpmChange={setBpm}
          onBeatsPerMeasureChange={setBeatsPerMeasure}
          onVolumeChange={setMetronomeVolume}
          onToggle={handleMetronomeToggle}
          onTapTempo={handleTapTempo}
        />
      ) : (
        <TunerWidget
          isActive={isTunerActive}
          note={note}
          error={tunerError}
          onToggle={handleTunerToggle}
        />
      )}
    </div>
  );
}
