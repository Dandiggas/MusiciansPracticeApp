"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";

export default function TunerPage() {
  const [isListening, setIsListening] = useState(false);
  const [note, setNote] = useState<NoteInfo | null>(null);
  const [referenceFreq, setReferenceFreq] = useState(440);
  const [error, setError] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const frequency = detectPitch(buffer, audioContextRef.current.sampleRate);

    if (frequency !== null) {
      setNote(frequencyToNote(frequency, referenceFreq));
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, [referenceFreq]);

  const startListening = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      rafRef.current = requestAnimationFrame(analyze);
    } catch {
      setError("Could not access microphone. Please allow microphone permissions.");
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);
    setNote(null);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const gaugePercent = note ? Math.max(0, Math.min(100, ((note.cents + 50) / 100) * 100)) : 50;
  const isInTune = note !== null && Math.abs(note.cents) <= 5;
  const isClose = note !== null && Math.abs(note.cents) <= 15;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tuner</h1>
        <p className="text-muted-foreground mt-2">Tune your instrument with your microphone</p>
      </div>

      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Chromatic Tuner</CardTitle>
            <CardDescription>Play a note and see how close you are</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Note Display */}
            <div className="text-center py-4">
              <div
                className={cn(
                  "text-8xl font-bold font-mono transition-colors",
                  !note && "text-muted-foreground/30",
                  note && isInTune && "text-green-500",
                  note && !isInTune && isClose && "text-yellow-500",
                  note && !isInTune && !isClose && "text-red-500"
                )}
              >
                {note ? `${note.name}${note.octave}` : "--"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {note
                  ? `${note.frequency.toFixed(1)} Hz`
                  : isListening
                    ? "Play a note..."
                    : "Press Start to begin"}
              </p>
            </div>

            {/* Cents Gauge */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Flat</span>
                <span>In Tune</span>
                <span>Sharp</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-500 z-10" />
                {/* Needle */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 -translate-x-1/2",
                    isInTune
                      ? "bg-green-500"
                      : isClose
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  )}
                  style={{ left: `${gaugePercent}%` }}
                />
              </div>
              <div className="text-center text-lg font-mono">
                {note ? `${note.cents > 0 ? "+" : ""}${note.cents} cents` : "-- cents"}
              </div>
            </div>

            {/* Reference Frequency */}
            <div className="flex items-center gap-3">
              <Label htmlFor="ref-freq" className="shrink-0">
                A4 =
              </Label>
              <Input
                id="ref-freq"
                type="number"
                min={420}
                max={460}
                value={referenceFreq}
                onChange={(e) => setReferenceFreq(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">Hz</span>
            </div>

            {error && (
              <div className="text-sm font-medium text-destructive text-center">{error}</div>
            )}

            {/* Start/Stop */}
            <Button
              onClick={isListening ? stopListening : startListening}
              className="w-full"
              size="lg"
              variant={isListening ? "destructive" : "default"}
            >
              {isListening ? (
                <>
                  <MicOff className="mr-2 h-5 w-5" /> Stop Tuner
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-5 w-5" /> Start Tuner
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
