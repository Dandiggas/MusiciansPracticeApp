"use client";

import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam) return vParam;
      const embedMatch = parsed.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

export interface YouTubePlayerHandle {
  getPlayer: () => YT.Player | null;
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: YT.Player) => void;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onReady }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YT.Player | null>(null);
    const prevVideoIdRef = useRef<string>('');

    useImperativeHandle(ref, () => ({
      getPlayer: () => playerRef.current,
    }));

    const createPlayer = useCallback(() => {
      if (!containerRef.current || !window.YT?.Player || !videoId) return;

      // Destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Create a fresh div for the player
      const playerDiv = document.createElement('div');
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            onReady?.(event.target);
          },
        },
      });

      prevVideoIdRef.current = videoId;
    }, [videoId, onReady]);

    // Load YouTube IFrame API
    useEffect(() => {
      if (window.YT?.Player) {
        createPlayer();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };

      return () => {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle video ID changes
    useEffect(() => {
      if (videoId && videoId !== prevVideoIdRef.current && window.YT?.Player) {
        createPlayer();
      }
    }, [videoId, createPlayer]);

    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    );
  }
);

export default YouTubePlayer;
