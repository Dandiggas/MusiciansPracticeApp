"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTrack } from "@/lib/api";
import { normalizeYouTubeUrl } from "@/lib/youtube";
import { Track } from "@/types/session";

const YOUTUBE_URL_ERROR =
  "Paste a normal YouTube link, e.g. https://youtu.be/...";

interface AddSourceCardProps {
  track: Track;
  replaceTrack: (track: Track) => void;
}

/** Shown on tracks imported without a source: paste a YouTube link to
 *  attach it in place — the song keeps its key, notes, and position. */
export function AddSourceCard({ track, replaceTrack }: AddSourceCardProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAttach() {
    const normalized = normalizeYouTubeUrl(url);
    if (!normalized) {
      setError(YOUTUBE_URL_ERROR);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updated = await updateTrack(track.id, {
        source_type: "youtube",
        youtube_url: normalized,
      });
      replaceTrack(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the source.");
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5">
      <p className="text-sm font-semibold text-foreground">
        Add a source for {track.name}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        Paste the YouTube version you&apos;re working from
        {track.called_key ? ` (it's called in ${track.called_key})` : ""} and
        the player, loops, and takes unlock right here. For an MP3, chart, or
        image, use Add Track instead.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          aria-label={`YouTube link for ${track.name}`}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://youtu.be/..."
          disabled={isSaving}
          className="min-w-56 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleAttach();
            }
          }}
        />
        <Button type="button" onClick={() => void handleAttach()} disabled={isSaving}>
          {isSaving ? "Adding..." : "Add source"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
