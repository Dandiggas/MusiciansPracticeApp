"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { Transport } from "@/hooks/transport";


export function useHtmlAudioTransport(url: string | null): {
  audioRef: RefObject<HTMLAudioElement | null>;
  transport: Transport;
} {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(null);
  }, [url]);

  const transport = useMemo<Transport>(
    () => ({
      play: async () => {
        if (!audioRef.current) {
          return;
        }
        await audioRef.current.play();
      },
      pause: () => {
        audioRef.current?.pause();
      },
      seek: (seconds) => {
        if (!audioRef.current) {
          return;
        }
        audioRef.current.currentTime = Math.max(0, seconds);
        setCurrentTime(audioRef.current.currentTime);
      },
      setSpeed: (rate) => {
        if (!audioRef.current) {
          return;
        }
        audioRef.current.playbackRate = rate;
      },
      currentTime,
      duration,
      isPlaying,
      error,
    }),
    [currentTime, duration, isPlaying, error]
  );

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.playbackRate = 1;
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setError(null);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError("This audio file could not be played.");
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [url]);

  return { audioRef, transport };
}
