"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import TunerWidget from "@/components/studio/TunerWidget";
import { Button } from "@/components/ui/button";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";


export function StandaloneTunerClient() {
  const [isActive, setIsActive] = useState(false);
  const [note, setNote] = useState<NoteInfo | null>(null);
  const [error, setError] = useState("");
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopTuner();
    };
  }, []);

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
    setIsActive(false);
    setNote(null);
    setError("");
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
      setIsActive(true);
      setError("");

      const buffer = new Float32Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current || !audioContextRef.current) {
          return;
        }

        analyserRef.current.getFloatTimeDomainData(buffer);
        const frequency = detectPitch(buffer, audioContextRef.current.sampleRate);
        if (frequency) {
          setNote(frequencyToNote(frequency));
        } else {
          setNote(null);
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setError("Microphone access is required to use the tuner.");
      stopTuner();
    }
  }

  function handleToggle() {
    if (isActive) {
      stopTuner();
      return;
    }

    void startTuner();
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Standalone tool
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
            Tune before you dig in.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Use the tuner on its own when you only need a quick pitch check.
            The same tuner now sits inside the session workbench too, so you
            can tune up without leaving the page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sessions">Back to sessions</Link>
            </Button>
          </div>
        </div>

        <TunerWidget
          isActive={isActive}
          note={note}
          error={error}
          onToggle={handleToggle}
        />
      </div>
    </div>
  );
}
