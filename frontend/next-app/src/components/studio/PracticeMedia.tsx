"use client";

import React, { type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { YoutubeLogo, UploadSimple } from "@phosphor-icons/react";
import YouTubePlayer, { extractVideoId, type YouTubePlayerHandle } from "@/components/youtube/YouTubePlayer";
import PlaybackSpeedControl from "@/components/youtube/PlaybackSpeedControl";
import ABLoopControl, { type LoopableMediaController } from "@/components/youtube/ABLoopControl";
import LocalAudioPlayer, { type LocalAudioPlayerHandle } from "@/components/media/LocalAudioPlayer";

type MediaSource = "youtube" | "audio";

interface PracticeMediaProps {
  instrument: string;
  songTitle: string;
  mediaSource: MediaSource;
  youtubeUrl: string;
  audioObjectUrl: string | null;
  audioFileName: string | null;
  playbackSpeed: number;
  youtubePlayerRef: RefObject<YouTubePlayerHandle | null>;
  audioPlayerRef: RefObject<LocalAudioPlayerHandle | null>;
  getLoopController: () => LoopableMediaController | null;
  onMediaSourceChange: (source: MediaSource) => void;
  onPlaybackSpeedChange: (speed: number) => void;
}

export default function PracticeMedia({
  instrument,
  songTitle,
  mediaSource,
  youtubeUrl,
  audioObjectUrl,
  audioFileName,
  playbackSpeed,
  youtubePlayerRef,
  audioPlayerRef,
  getLoopController,
  onMediaSourceChange,
  onPlaybackSpeedChange,
}: PracticeMediaProps) {
  const videoId = extractVideoId(youtubeUrl);

  return (
    <div className="rounded-xl bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Practice Media
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {instrument}{songTitle ? ` \u00B7 ${songTitle}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant={mediaSource === "youtube" ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-7"
            onClick={() => onMediaSourceChange("youtube")}
          >
            <YoutubeLogo size={20} weight="regular" className="mr-1" /> YouTube
          </Button>
          <Button
            variant={mediaSource === "audio" ? "default" : "secondary"}
            size="sm"
            className="rounded-lg text-xs h-7"
            onClick={() => onMediaSourceChange("audio")}
          >
            <UploadSimple size={20} weight="regular" className="mr-1" /> MP3
          </Button>
        </div>
      </div>

      {mediaSource === "youtube" && videoId ? (
        <div className="space-y-3">
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <YouTubePlayer ref={youtubePlayerRef} videoId={videoId} />
          </div>
          <div className="flex flex-wrap gap-3">
            <PlaybackSpeedControl currentSpeed={playbackSpeed} onSpeedChange={onPlaybackSpeedChange} />
            <ABLoopControl getController={getLoopController} />
          </div>
        </div>
      ) : mediaSource === "audio" && audioObjectUrl ? (
        <div className="space-y-3">
          {audioFileName && (
            <p className="text-sm text-muted-foreground">{audioFileName}</p>
          )}
          <LocalAudioPlayer
            ref={audioPlayerRef}
            audioUrl={audioObjectUrl}
            playbackSpeed={playbackSpeed}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {mediaSource === "youtube" ? "Enter a YouTube URL to load" : "Upload an MP3 file"}
          </p>
        </div>
      )}
    </div>
  );
}
