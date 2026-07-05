"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Circle,
  Download,
  Microphone,
  ArrowCounterClockwise,
  Square,
  Video,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MotionDiv } from "@/components/ui/motion-wrapper";
import { AnimatePresence } from "framer-motion";

type RecordingMode = "audio" | "video";

const MIME_CANDIDATES: Record<RecordingMode, string[]> = {
  audio: [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ],
  video: [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ],
};

function getSupportedMimeType(mode: RecordingMode) {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  return MIME_CANDIDATES[mode].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TakeRecorder() {
  const [mode, setMode] = useState<RecordingMode>("audio");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState("");
  const [recordingMimeType, setRecordingMimeType] = useState("");

  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isVideoMode = mode === "video";
  const hasRecording = Boolean(recordingUrl);
  const downloadExtension = useMemo(() => {
    if (!recordingMimeType) {
      return isVideoMode ? "webm" : "webm";
    }

    if (recordingMimeType.includes("mp4")) {
      return "mp4";
    }

    if (recordingMimeType.includes("audio")) {
      return "webm";
    }

    return "webm";
  }, [isVideoMode, recordingMimeType]);

  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordingUrl]);

  useEffect(() => {
    if (!isRecording || !isVideoMode || !livePreviewRef.current || !streamRef.current) {
      return;
    }

    const preview = livePreviewRef.current;
    preview.srcObject = streamRef.current;
    preview.muted = true;
    void preview.play().catch(() => {});
  }, [isRecording, isVideoMode]);

  const resetRecording = () => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }
    setRecordingUrl(null);
    setElapsedSeconds(0);
    setRecordingError("");
    setRecordingMimeType("");
    chunksRef.current = [];
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (livePreviewRef.current) {
      livePreviewRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    setRecordingError("");
    setIsPreparing(true);

    try {
      if (
        typeof window === "undefined" ||
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        setRecordingError("Recording is not supported in this browser.");
        return;
      }

      resetRecording();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoMode,
      });
      streamRef.current = stream;

      if (livePreviewRef.current && isVideoMode) {
        livePreviewRef.current.srcObject = stream;
        livePreviewRef.current.muted = true;
        void livePreviewRef.current.play().catch(() => {});
      }

      const mimeType = getSupportedMimeType(mode);
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      setRecordingMimeType(recorder.mimeType || mimeType);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || undefined,
        });

        if (blob.size > 0) {
          const nextUrl = URL.createObjectURL(blob);
          setRecordingUrl(nextUrl);
        }

        stopStream();
      };

      recorderRef.current = recorder;
      recorder.start();
      setElapsedSeconds(0);
      setIsRecording(true);
    } catch {
      setRecordingError(
        isVideoMode
          ? "Could not access camera and microphone. Check your browser permissions."
          : "Could not access microphone. Check your browser permissions."
      );
      stopStream();
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={mode === "audio" ? "selected" : "outline"}
          className="h-10 rounded-full px-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          onClick={() => setMode("audio")}
          disabled={isRecording || isPreparing}
        >
          <Microphone size={20} weight="regular" className="mr-2" />
          Audio Only
        </Button>
        <Button
          type="button"
          variant={mode === "video" ? "selected" : "outline"}
          className="h-10 rounded-full px-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          onClick={() => setMode("video")}
          disabled={isRecording || isPreparing}
        >
          <Camera size={20} weight="regular" className="mr-2" />
          Video + Audio
        </Button>
      </div>

      <div className="rounded-[1.75rem] border border-border/60 bg-card p-4">
        {isRecording && isVideoMode ? (
          <video
            ref={livePreviewRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-[1.25rem] border border-border/60 bg-black object-cover"
          />
        ) : hasRecording ? (
          isVideoMode ? (
            <video
              ref={(node) => {
                playbackRef.current = node;
              }}
              controls
              playsInline
              src={recordingUrl ?? undefined}
              className="aspect-video w-full rounded-[1.25rem] border border-border/60 bg-black object-cover"
            />
          ) : (
            <div className="space-y-4 rounded-[1.25rem] border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/[0.12] p-3 text-primary">
                  <Microphone size={20} weight="regular" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Audio take ready for review
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Listen back to what you actually played.
                  </p>
                </div>
              </div>
              <audio
                ref={(node) => {
                  playbackRef.current = node;
                }}
                controls
                src={recordingUrl ?? undefined}
                className="w-full"
              />
            </div>
          )
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-muted/30 px-6 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-fit rounded-full bg-primary/[0.12] p-4 text-primary">
                {isVideoMode ? (
                  <Video size={20} weight="regular" />
                ) : (
                  <Microphone size={20} weight="regular" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {isVideoMode
                    ? "Record a take with webcam and audio"
                    : "Record an audio take and listen back"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Useful for hearing what you really sound like, not what you think you sound like.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-border/60 bg-card/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-sm text-foreground">
                {isRecording
                  ? "Recording now"
                  : hasRecording
                    ? "Take captured locally"
                    : "Ready to record"}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-muted px-3 py-1 font-mono text-sm font-semibold text-foreground">
            {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        {recordingError && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {recordingError}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <AnimatePresence mode="wait">
            {isRecording ? (
              <MotionDiv
                key="stop"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              >
                <Button
                  type="button"
                  onClick={stopRecording}
                  variant="destructiveOutline"
                  className="h-11 w-full rounded-2xl"
                >
                  <Square size={20} weight="regular" className="mr-2" />
                  Stop Recording
                </Button>
              </MotionDiv>
            ) : (
              <MotionDiv
                key="start"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
              >
                <Button
                  type="button"
                  onClick={() => {
                    void startRecording();
                  }}
                  disabled={isPreparing}
                  className="h-11 w-full rounded-2xl"
                >
                  <Circle size={20} weight="regular" className="mr-2" />
                  {isPreparing ? "Preparing..." : "Start Recording"}
                </Button>
              </MotionDiv>
            )}
          </AnimatePresence>

          <AnimatePresence>
          {hasRecording && recordingUrl && (
            <MotionDiv
              key="take-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetRecording}
                className="h-11 rounded-2xl shadow-none"
              >
                <ArrowCounterClockwise size={20} weight="regular" className="mr-2" />
                Record Another Take
              </Button>
              <Button
                type="button"
                asChild
                variant="outline"
                className="h-11 rounded-2xl"
              >
                <a
                  href={recordingUrl}
                  download={`practice-take-${mode}.${downloadExtension}`}
                >
                  <Download size={20} weight="regular" className="mr-2" />
                  Download Take
                </a>
              </Button>
            </div>
            </MotionDiv>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
