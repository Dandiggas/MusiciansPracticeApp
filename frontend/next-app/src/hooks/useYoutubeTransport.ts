"use client";

import { RefObject, useEffect, useMemo, useRef, useState } from "react";

import { Transport } from "@/hooks/transport";


const YOUTUBE_SPEEDS = [0.25, 0.5, 0.75, 1];

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise<void>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existing) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = () => resolve();
    });
  }

  return youtubeApiPromise;
}

function nearestYoutubeSpeed(rate: number, availableRates = YOUTUBE_SPEEDS) {
  return availableRates.reduce((closest, current) =>
    Math.abs(current - rate) < Math.abs(closest - rate) ? current : closest
  );
}

function getAvailableYoutubeRates(player: Partial<YT.Player> | null) {
  if (!player || typeof player.getAvailablePlaybackRates !== "function") {
    return YOUTUBE_SPEEDS;
  }

  try {
    const availableRates = player
      .getAvailablePlaybackRates()
      .filter((rate): rate is number => Number.isFinite(rate));

    return availableRates.length > 0 ? availableRates : YOUTUBE_SPEEDS;
  } catch {
    return YOUTUBE_SPEEDS;
  }
}

function safePlayerCall<TArgs extends unknown[]>(
  player: Partial<YT.Player> | null,
  methodName: keyof YT.Player,
  ...args: TArgs
) {
  const method = player?.[methodName];
  if (typeof method !== "function") {
    return;
  }

  try {
    Reflect.apply(method, player, args);
  } catch {
    // no-op while the iframe API is still warming up
  }
}

export function applyYoutubePlaybackRate(
  player: Partial<YT.Player> | null,
  rate: number
) {
  if (!player || typeof player.setPlaybackRate !== "function") {
    return;
  }

  safePlayerCall(
    player,
    "setPlaybackRate",
    nearestYoutubeSpeed(rate, getAvailableYoutubeRates(player))
  );
}

export function extractVideoId(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) {
        return id;
      }
      const match = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] ?? null;
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
  }

  return null;
}

export function useYoutubeTransport(url: string | null): {
  mountRef: RefObject<HTMLDivElement | null>;
  transport: Transport;
} {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const pollRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoId = extractVideoId(url || "");

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setError(videoId ? null : "Enter a valid YouTube link.");
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;

    async function setupPlayer() {
      if (!videoId || !mountRef.current) {
        return;
      }

      await loadYoutubeApi();
      if (cancelled || !mountRef.current || !window.YT?.Player) {
        return;
      }

      playerRef.current?.destroy();
      mountRef.current.innerHTML = "";
      const node = document.createElement("div");
      mountRef.current.appendChild(node);

      playerRef.current = new window.YT.Player(node, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration() || 0);
            setError(null);
          },
          onStateChange: (event) => {
            setIsPlaying(event.data === window.YT?.PlayerState.PLAYING);
          },
          onError: () => {
            setError("This YouTube video could not be played.");
            setIsPlaying(false);
          },
        },
      });
    }

    void setupPlayer();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
    }

    pollRef.current = window.setInterval(() => {
      if (!playerRef.current) {
        return;
      }
      try {
        setCurrentTime(playerRef.current.getCurrentTime() || 0);
        setDuration(playerRef.current.getDuration() || 0);
      } catch {
        // no-op while player is initializing
      }
    }, 250);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [videoId]);

  const transport = useMemo<Transport>(
    () => ({
      play: () => safePlayerCall(playerRef.current, "playVideo"),
      pause: () => safePlayerCall(playerRef.current, "pauseVideo"),
      seek: (seconds) => safePlayerCall(playerRef.current, "seekTo", Math.max(0, seconds), true),
      setSpeed: (rate) => applyYoutubePlaybackRate(playerRef.current, rate),
      currentTime,
      duration,
      isPlaying,
      error,
    }),
    [currentTime, duration, isPlaying, error]
  );

  return { mountRef, transport };
}
