"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Youtube, Upload } from "lucide-react";
import { INSTRUMENTS } from "@/lib/practice-session-store";

type MediaSource = "youtube" | "audio";

interface SessionSetupFormProps {
  instrument: string;
  songTitle: string;
  description: string;
  notes: string;
  youtubeUrl: string;
  mediaSource: MediaSource;
  audioFileName: string | null;
  isLoading: boolean;
  error: string;
  onInstrumentChange: (value: string) => void;
  onSongTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onYoutubeUrlChange: (value: string) => void;
  onMediaSourceChange: (value: MediaSource) => void;
  onAudioFileSelect: (file: File) => void;
  onStart: () => void;
}

export default function SessionSetupForm({
  instrument,
  songTitle,
  description,
  notes,
  youtubeUrl,
  mediaSource,
  audioFileName,
  isLoading,
  error,
  onInstrumentChange,
  onSongTitleChange,
  onDescriptionChange,
  onNotesChange,
  onYoutubeUrlChange,
  onMediaSourceChange,
  onAudioFileSelect,
  onStart,
}: SessionSetupFormProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAudioFileSelect(file);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="instrument" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Instrument
          </Label>
          <select
            id="instrument"
            value={instrument}
            onChange={(e) => onInstrumentChange(e.target.value)}
            required
            className="flex h-11 w-full rounded-lg bg-muted px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select an instrument</option>
            {INSTRUMENTS.map((inst) => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="song-title" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Song Title
          </Label>
          <Input
            id="song-title"
            value={songTitle}
            onChange={(e) => onSongTitleChange(e.target.value)}
            placeholder="e.g., All The Things You Are"
            className="h-11 rounded-lg bg-muted border-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Description
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g., Chord melody arrangement"
          className="h-11 rounded-lg bg-muted border-0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Focus Points
        </Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="What are you focusing on this session?"
          rows={2}
          className="flex w-full rounded-lg bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          Practice Source
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mediaSource === "youtube" ? "default" : "secondary"}
            size="sm"
            onClick={() => onMediaSourceChange("youtube")}
            className="rounded-lg"
          >
            <Youtube className="mr-1.5 h-4 w-4" />
            YouTube
          </Button>
          <Button
            type="button"
            variant={mediaSource === "audio" ? "default" : "secondary"}
            size="sm"
            onClick={() => onMediaSourceChange("audio")}
            className="rounded-lg"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            MP3 Upload
          </Button>
        </div>

        {mediaSource === "youtube" ? (
          <Input
            id="youtube-url"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 rounded-lg bg-muted border-0"
          />
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            {audioFileName && (
              <p className="text-sm text-muted-foreground">{audioFileName}</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <Button
        onClick={onStart}
        disabled={isLoading}
        className="w-full h-12 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground font-semibold text-base"
      >
        {isLoading ? "Starting..." : "Start Session"}
      </Button>
    </div>
  );
}
