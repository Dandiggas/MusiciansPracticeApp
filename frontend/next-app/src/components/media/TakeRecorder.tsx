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
import { cn } from "@/lib/utils";

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
          variant={mode === "audio" ? "default" : "outline"}
          className={cn(
            "h-10 rounded-full px-4",
            mode === "audio"
              ? "bg-slate-950 text-white hover:bg-slate-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
          onClick={() => setMode("audio")}
          disabled={isRecording || isPreparing}
        >
          <Microphone size={20} weight="regular" className="mr-2" />
          Audio Only
        </Button>
        <Button
          type="button"
          variant={mode === "video" ? "default" : "outline"}
          className={cn(
            "h-10 rounded-full px-4",
            mode === "video"
              ? "bg-slate-950 text-white hover:bg-slate-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
          onClick={() => setMode("video")}
          disabled={isRecording || isPreparing}
        >
          <Camera size={20} weight="regular" className="mr-2" />
          Video + Audio
        </Button>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.92))] p-4">
        {isRecording && isVideoMode ? (
          <video
            ref={livePreviewRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-[1.25rem] border border-slate-200 bg-slate-950 object-cover"
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
              className="aspect-video w-full rounded-[1.25rem] border border-slate-200 bg-slate-950 object-cover"
            />
          ) : (
            <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-950 p-3 text-white">
                  <Microphone size={20} weight="regular" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Audio take ready for review
                  </p>
                  <p className="text-xs text-slate-500">
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
          <div className="flex aspect-video items-center justify-center rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-fit rounded-full bg-slate-950 p-4 text-white">
                {isVideoMode ? (
                  <Video size={20} weight="regular" />
                ) : (
                  <Microphone size={20} weight="regular" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {isVideoMode
                    ? "Record a take with webcam and audio"
                    : "Record an audio take and listen back"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Useful for hearing what you really sound like, not what you think you sound like.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {isRecording
                ? "Recording now"
                : hasRecording
                  ? "Take captured locally"
                  : "Ready to record"}
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm">
            {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        {recordingError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {recordingError}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          {isRecording ? (
            <Button
              type="button"
              onClick={stopRecording}
              variant="destructive"
              className="h-11 rounded-2xl"
            >
              <Square size={20} weight="regular" className="mr-2" />
              Stop Recording
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                void startRecording();
              }}
              disabled={isPreparing}
              className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
            >
              <Circle size={20} weight="regular" className="mr-2" />
              {isPreparing ? "Preparing..." : "Start Recording"}
            </Button>
          )}

          {hasRecording && recordingUrl && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetRecording}
                className="h-11 rounded-2xl border border-slate-200 bg-slate-100 text-slate-800 shadow-none hover:bg-slate-200"
              >
                <ArrowCounterClockwise size={20} weight="regular" className="mr-2" />
                Record Another Take
              </Button>
              <Button
                type="button"
                asChild
                variant="outline"
                className="h-11 rounded-2xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
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
          )}
        </div>
      </div>
    </div>
  );
}
