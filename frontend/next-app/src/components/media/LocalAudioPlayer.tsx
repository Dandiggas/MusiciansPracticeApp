"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Music, Pause, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface LocalAudioPlayerHandle {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
}

interface LocalAudioPlayerProps {
  audioUrl: string | null;
  fileName?: string | null;
  playbackSpeed: number;
}

function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const LocalAudioPlayer = forwardRef<LocalAudioPlayerHandle, LocalAudioPlayerProps>(
  function LocalAudioPlayer({ audioUrl, fileName, playbackSpeed }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => audioRef.current?.currentTime ?? 0,
      seekTo: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
        }
      },
      setPlaybackRate: (rate: number) => {
        if (audioRef.current) {
          audioRef.current.playbackRate = rate;
        }
      },
    }));

    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
      }
    }, [playbackSpeed]);

    useEffect(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }, [audioUrl]);

    const togglePlayback = async () => {
      if (!audioRef.current || !audioUrl) return;

      if (audioRef.current.paused) {
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
          {audioUrl ? (
            <div className="flex w-full max-w-xl flex-col items-center gap-4 px-6 text-center">
              <div className="rounded-full bg-white/10 p-4">
                <Music className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold">Local Audio Practice</p>
                <p className="truncate text-sm text-slate-300">
                  {fileName || "Uploaded MP3"}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  void togglePlayback();
                }}
                variant="secondary"
                className="min-w-32"
              >
                {isPlaying ? (
                  <><Pause className="mr-2 h-4 w-4" /> Pause</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Play</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 px-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-slate-400" />
              <div>
                <p className="font-semibold">Upload an MP3 to start practicing</p>
                <p className="text-sm text-slate-300">
                  Slow it down and loop difficult sections just like a YouTube track.
                </p>
              </div>
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatTimestamp(currentTime)}</span>
            <span>{formatTimestamp(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(e.target.value);
                setCurrentTime(Number(e.target.value));
              }
            }}
            disabled={!audioUrl}
            className={cn(
              "h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary",
              !audioUrl && "cursor-not-allowed opacity-50"
            )}
          />
        </div>
      </div>
    );
  }
);

export default LocalAudioPlayer;
