"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AddTrackForm } from "@/components/sessions/AddTrackForm";
import { SessionHeader } from "@/components/sessions/SessionHeader";
import { SessionPracticeTools } from "@/components/sessions/SessionPracticeTools";
import { TrackList } from "@/components/sessions/TrackList";
import { TrackPane } from "@/components/sessions/TrackPane";
import { reorderTracks } from "@/lib/api";
import { SessionDetail, Track } from "@/types/session";


function sortTracks(tracks: Track[]) {
  return [...tracks].sort((left, right) => left.position - right.position);
}

export function SessionWorkbench({ session }: { session: SessionDetail }) {
  const router = useRouter();
  const [sessionState, setSessionState] = useState(session);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(
    session.tracks[0]?.id ?? null
  );
  const [sidebarError, setSidebarError] = useState("");
  const trackListRef = useRef<HTMLDivElement | null>(null);
  const trackPaneRef = useRef<HTMLElement | null>(null);
  const pendingCreatedTrackIdRef = useRef<number | null>(null);

  useEffect(() => {
    setSessionState(session);
    setSelectedTrackId((current) => {
      if (current !== null && session.tracks.some((track) => track.id === current)) {
        return current;
      }
      return session.tracks[0]?.id ?? null;
    });
  }, [session]);

  const selectedTrack = useMemo(
    () => sessionState.tracks.find((track) => track.id === selectedTrackId) ?? null,
    [selectedTrackId, sessionState.tracks]
  );

  useEffect(() => {
    if (
      pendingCreatedTrackIdRef.current === null ||
      pendingCreatedTrackIdRef.current !== selectedTrackId
    ) {
      return;
    }

    const createdTrackId = pendingCreatedTrackIdRef.current;
    const frame = window.requestAnimationFrame(() => {
      const trackRow = trackListRef.current?.querySelector<HTMLElement>(
        `[data-track-row-id="${createdTrackId}"]`
      );

      trackRow?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });

      const trackButton = trackRow?.querySelector<HTMLButtonElement>(
        "[data-track-select-button]"
      );
      try {
        trackButton?.focus({ preventScroll: true });
      } catch {
        trackButton?.focus();
      }

      if (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 1279px)").matches
      ) {
        trackPaneRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      pendingCreatedTrackIdRef.current = null;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedTrackId, sessionState.tracks]);

  function mutateSession(updater: (current: SessionDetail) => SessionDetail) {
    setSessionState((current) => updater(current));
  }

  function mutateTrack(trackId: number, updater: (track: Track) => Track) {
    setSessionState((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === trackId ? updater(track) : track
      ),
    }));
  }

  function replaceTrack(trackId: number, nextTrack: Track) {
    mutateTrack(trackId, () => nextTrack);
  }

  function handleTrackCreated(track: Track) {
    pendingCreatedTrackIdRef.current = track.id;
    setSessionState((current) => ({
      ...current,
      tracks: sortTracks([
        track,
        ...current.tracks.map((existingTrack) =>
          existingTrack.position >= track.position
            ? { ...existingTrack, position: existingTrack.position + 1 }
            : existingTrack
        ),
      ]),
      updated_at: new Date().toISOString(),
    }));
    setSelectedTrackId(track.id);
  }

  function handleTrackDeleted(trackId: number) {
    setSessionState((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== trackId),
      updated_at: new Date().toISOString(),
    }));

    setSelectedTrackId((current) => {
      if (current !== trackId) {
        return current;
      }
      const remaining = sessionState.tracks.filter((track) => track.id !== trackId);
      return remaining[0]?.id ?? null;
    });
  }

  async function handleReorder(trackIds: number[]) {
    setSidebarError("");
    const previousTracks = sessionState.tracks;
    setSessionState((current) => ({
      ...current,
      tracks: trackIds
        .map((trackId, index) => {
          const track = current.tracks.find((item) => item.id === trackId);
          return track ? { ...track, position: index } : null;
        })
        .filter((track): track is Track => track !== null),
    }));

    try {
      await reorderTracks(sessionState.id, trackIds);
    } catch (err) {
      setSidebarError(err instanceof Error ? err.message : "Could not reorder tracks.");
      setSessionState((current) => ({
        ...current,
        tracks: previousTracks,
      }));
    }
  }

  return (
    <div className="space-y-6">
      <SessionHeader
        session={sessionState}
        mutateSession={mutateSession}
        onDeleted={() => router.push("/sessions")}
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Tracks
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Click between songs, charts, and media sources without leaving the session.
              </p>
            </div>
            {sessionState.tracks.length > 0 ? (
              <div ref={trackListRef} className="max-h-[26rem] overflow-y-auto pr-1">
                <TrackList
                  tracks={sessionState.tracks}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={setSelectedTrackId}
                  onReorder={handleReorder}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                No tracks yet. Add the first song, chart, or clip below.
              </div>
            )}
            <div className="mt-4 border-t border-border/60 pt-4">
              <AddTrackForm
                sessionId={sessionState.id}
                insertPosition={0}
                onTrackCreated={handleTrackCreated}
              />
            </div>
            {sidebarError ? <p className="mt-3 text-sm text-destructive">{sidebarError}</p> : null}
          </div>

          <SessionPracticeTools
            trackName={selectedTrack?.name ?? null}
            trackBpm={selectedTrack?.bpm ?? null}
          />
        </aside>

        <section
          ref={trackPaneRef}
          data-track-pane="selected-track-pane"
          className="min-w-0"
        >
          {selectedTrack ? (
            <TrackPane
              track={selectedTrack}
              mutateTrack={(updater) => mutateTrack(selectedTrack.id, updater)}
              replaceTrack={(track) => replaceTrack(selectedTrack.id, track)}
              onTrackDeleted={handleTrackDeleted}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-10 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Empty session
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                Add your first practice item
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Start by saving a YouTube link, an MP3, a PDF, or an image.
                Once a track exists, this panel becomes the place where you
                switch between songs, set tempos, and store the licks you keep
                coming back to.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
