"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mp3Player } from "@/components/sessions/Mp3Player";
import { TrackTakesPanel } from "@/components/sessions/TrackTakesPanel";
import { YoutubePlayer } from "@/components/sessions/YoutubePlayer";
import { deleteTrack, updateTrack } from "@/lib/api";
import { Track } from "@/types/session";


const SheetView = dynamic(
  () => import("@/components/sessions/SheetView").then((module) => module.SheetView),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Loading sheet view...
      </div>
    ),
  }
);


interface TrackPaneProps {
  onTrackDeleted: (trackId: number) => void;
  mutateTrack: (updater: (track: Track) => Track) => void;
  replaceTrack: (track: Track) => void;
  track: Track;
}

export function TrackPane({
  onTrackDeleted,
  mutateTrack,
  replaceTrack,
  track,
}: TrackPaneProps) {
  const [name, setName] = useState(track.name);
  const [bpm, setBpm] = useState(track.bpm?.toString() ?? "");
  const [note, setNote] = useState(track.note ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setName(track.name);
    setBpm(track.bpm?.toString() ?? "");
    setNote(track.note ?? "");
  }, [track.id, track.name, track.bpm, track.note]);

  const parsedBpm = useMemo(() => {
    if (!bpm.trim()) {
      return null;
    }

    const value = Number(bpm);
    return Number.isFinite(value) ? value : null;
  }, [bpm]);

  const isDirty =
    name.trim() !== track.name ||
    note !== (track.note ?? "") ||
    (parsedBpm === null ? null : parsedBpm) !== track.bpm;

  async function handleSave() {
    if (!name.trim()) {
      setError("Track name is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updated = await updateTrack(track.id, {
        name: name.trim(),
        bpm: parsedBpm,
        note,
      });
      replaceTrack(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update track.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${track.name}" and its licks and takes?`)) {
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await deleteTrack(track.id);
      onTrackDeleted(track.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete track.");
      setIsDeleting(false);
    }
  }

  const sourceDetail = track.source_type === "youtube"
    ? track.youtube_url
    : track.file?.split("/").pop()?.split("?")[0] ?? "Uploaded file";

  return (
    <div className="min-w-0 space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] 2xl:items-end">
          <div className="min-w-0 space-y-4">
            <div className="min-w-0">
              <label
                htmlFor="track-name-edit"
                className="text-sm font-medium text-foreground"
              >
                Track name
              </label>
              <Input
                id="track-name-edit"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 text-lg font-semibold"
              />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-[160px] shrink-0">
                <label
                  htmlFor="track-bpm-edit"
                  className="text-sm font-medium text-foreground"
                >
                  BPM
                </label>
                <Input
                  id="track-bpm-edit"
                  type="number"
                  min={30}
                  max={300}
                  value={bpm}
                  onChange={(event) => setBpm(event.target.value)}
                  className="mt-2 h-11"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
                  {isSaving ? "Saving..." : "Save Track"}
                </Button>
                <Button type="button" variant="destructiveOutline" onClick={() => void handleDelete()} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-border/60 bg-muted/20 p-4 2xl:border-none 2xl:bg-transparent 2xl:p-0">
            <p className="text-sm font-medium text-foreground">
              Source
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {track.source_type.toUpperCase()}
            </p>
            <p className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {sourceDetail}
            </p>
          </div>
        </div>

        <div className="mt-5 min-w-0">
          <label
            htmlFor="track-note-edit"
            className="text-sm font-medium text-foreground"
          >
            Track notes
          </label>
          <Textarea
            id="track-note-edit"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add fingering ideas, cue points, voicing reminders, or anything you want to remember next time."
            className="mt-2 min-h-32 resize-y"
          />
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      {track.source_type === "mp3" ? (
        <Mp3Player track={track} mutateTrack={mutateTrack} replaceTrack={replaceTrack} />
      ) : null}
      {track.source_type === "youtube" ? (
        <YoutubePlayer track={track} mutateTrack={mutateTrack} replaceTrack={replaceTrack} />
      ) : null}
      {(track.source_type === "pdf" || track.source_type === "image") ? (
        <SheetView track={track} />
      ) : null}

      <TrackTakesPanel track={track} mutateTrack={mutateTrack} />
    </div>
  );
}
