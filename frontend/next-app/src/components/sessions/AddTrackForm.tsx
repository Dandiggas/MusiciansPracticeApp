"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTrack } from "@/lib/api";
import { Track, TrackSourceType } from "@/types/session";


interface AddTrackFormProps {
  insertPosition: number;
  onTrackCreated: (track: Track) => void;
  sessionId: number;
}

const SOURCE_LABELS: Record<Exclude<TrackSourceType, "none">, string> = {
  youtube: "YouTube",
  mp3: "MP3",
  pdf: "PDF",
  image: "Image",
};

const YOUTUBE_URL_ERROR =
  "Paste a normal YouTube link, e.g. https://youtu.be/...";
const TRACK_NETWORK_ERROR =
  "We couldn't save this track because the app server didn't respond. Please try again.";

function extractYouTubeVideoId(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (hostname === "youtube.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const [kind, id] = url.pathname.split("/").filter(Boolean);
      if (kind === "shorts") {
        videoId = id ?? null;
      }
    }
  }

  if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
    return null;
  }

  return videoId;
}

function normalizeYouTubeUrl(value: string) {
  const videoId = extractYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function isNetworkFailureMessage(message: string) {
  return /failed to fetch|networkerror|load failed|app server/i.test(message);
}

function createTrackErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not create track.";
  }

  if (isNetworkFailureMessage(error.message)) {
    return TRACK_NETWORK_ERROR;
  }

  return error.message || "Could not create track.";
}

export function AddTrackForm({
  insertPosition,
  onTrackCreated,
  sessionId,
}: AddTrackFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<TrackSourceType>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [bpm, setBpm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accept = useMemo(() => {
    if (sourceType === "mp3") {
      return ".mp3,.m4a,.wav,.ogg,.flac,.aac";
    }
    if (sourceType === "pdf") {
      return ".pdf";
    }
    if (sourceType === "image") {
      return ".png,.jpg,.jpeg,.webp,.gif";
    }
    return undefined;
  }, [sourceType]);

  function handleSourceTypeChange(nextSourceType: TrackSourceType) {
    setSourceType(nextSourceType);
    setError("");

    if (nextSourceType === "youtube") {
      setFile(null);
      return;
    }

    setYoutubeUrl("");
  }

  function resetForm() {
    setName("");
    setYoutubeUrl("");
    setBpm("");
    setFile(null);
    setError("");
    setSourceType("youtube");
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Track name is required.");
      return;
    }
    if (sourceType === "youtube" && !youtubeUrl.trim()) {
      setError("YouTube URL is required.");
      return;
    }
    if (sourceType !== "youtube" && !file) {
      setError("A file is required for this source type.");
      return;
    }

    let normalizedYouTubeUrl = "";
    if (sourceType === "youtube") {
      const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);
      if (!normalizedUrl) {
        setError(YOUTUBE_URL_ERROR);
        return;
      }
      normalizedYouTubeUrl = normalizedUrl;
    }

    const formData = new FormData();
    formData.append("session", String(sessionId));
    formData.append("name", name.trim());
    formData.append("source_type", sourceType);
    formData.append("position", String(insertPosition));
    if (bpm.trim()) {
      formData.append("bpm", bpm.trim());
    }
    if (sourceType === "youtube") {
      formData.append("youtube_url", normalizedYouTubeUrl);
    } else if (file) {
      formData.append("file", file);
    }

    setIsSubmitting(true);
    setError("");
    try {
      const track = await createTrack(formData);
      onTrackCreated(track);
      resetForm();
    } catch (err) {
      setError(createTrackErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
      {!open ? (
        <Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
          <Plus size={16} weight="bold" />
          Add Track
        </Button>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Add track
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a YouTube link, MP3, PDF, or image exactly as you want to practise it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="track-name">Track name</Label>
            <Input
              id="track-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Praise on Demand"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="track-source">Source type</Label>
            <select
              id="track-source"
              value={sourceType}
              onChange={(event) => handleSourceTypeChange(event.target.value as TrackSourceType)}
              className="border-input flex h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              disabled={isSubmitting}
            >
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {sourceType === "youtube" ? (
            <div className="space-y-2">
              <Label htmlFor="track-url">YouTube URL</Label>
              <Input
                key="track-url"
                id="track-url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="track-file">File</Label>
              <Input
                key={`track-file-${sourceType}`}
                id="track-file"
                type="file"
                accept={accept}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="track-bpm">BPM (optional)</Label>
            <Input
              id="track-bpm"
              type="number"
              min={30}
              max={300}
              value={bpm}
              onChange={(event) => setBpm(event.target.value)}
              placeholder="120"
              disabled={isSubmitting}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Track"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
