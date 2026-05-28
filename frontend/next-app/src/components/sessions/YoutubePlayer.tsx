"use client";

import { useCallback } from "react";

import { LickPanel } from "@/components/sessions/LickPanel";
import { TransportControls } from "@/components/sessions/TransportControls";
import { useLickEngine } from "@/hooks/useLickEngine";
import { useYoutubeTransport } from "@/hooks/useYoutubeTransport";
import { updateLick, updateTrack } from "@/lib/api";
import { Track } from "@/types/session";


const YOUTUBE_SPEEDS = [0.25, 0.5, 0.75, 1];

function normalizeYoutubeSpeed(speed: number) {
  return YOUTUBE_SPEEDS.reduce((closest, current) =>
    Math.abs(current - speed) < Math.abs(closest - speed) ? current : closest
  );
}

interface YoutubePlayerProps {
  mutateTrack: (updater: (track: Track) => Track) => void;
  replaceTrack: (track: Track) => void;
  track: Track;
}

export function YoutubePlayer({
  mutateTrack,
  replaceTrack,
  track,
}: YoutubePlayerProps) {
  const { mountRef, transport } = useYoutubeTransport(track.youtube_url);

  const persistTrackSpeed = useCallback(
    async (speed: number) => {
      const normalized = normalizeYoutubeSpeed(speed);
      mutateTrack((current) => ({ ...current, last_speed: normalized }));
      try {
        await updateTrack(track.id, { last_speed: normalized });
      } catch {
        // Leave optimistic value in place for now.
      }
    },
    [mutateTrack, track.id]
  );

  const persistLickSpeed = useCallback(
    async (lickId: number, speed: number) => {
      const normalized = normalizeYoutubeSpeed(speed);
      mutateTrack((current) => ({
        ...current,
        licks: current.licks.map((lick) =>
          lick.id === lickId ? { ...lick, last_speed: normalized } : lick
        ),
      }));
      try {
        const updated = await updateLick(lickId, { last_speed: normalized });
        mutateTrack((current) => ({
          ...current,
          licks: current.licks.map((lick) => (lick.id === updated.id ? updated : lick)),
        }));
      } catch {
        // Leave optimistic value in place for now.
      }
    },
    [mutateTrack]
  );

  const lickEngine = useLickEngine({
    licks: track.licks,
    trackLastSpeed: track.last_speed,
    transport,
    normalizeSpeed: normalizeYoutubeSpeed,
    onPersistTrackSpeed: persistTrackSpeed,
    onPersistLickSpeed: persistLickSpeed,
  });

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="aspect-video bg-black">
          <div ref={mountRef} className="h-full w-full" />
        </div>

        <div className="p-5">
          <TransportControls
            transport={transport}
            speed={lickEngine.speed}
            onSpeedChange={lickEngine.setSpeed}
            speedMin={0.25}
            speedMax={1}
            speedStep={0.25}
          />
        </div>
      </div>

      <LickPanel
        track={track}
        activeLick={lickEngine.activeLick}
        setActiveLickId={lickEngine.setActiveLickId}
        setDraftEnd={lickEngine.setDraftEnd}
        setDraftStart={lickEngine.setDraftStart}
        toggleLick={lickEngine.toggleLick}
        draftStart={lickEngine.draftStart}
        draftEnd={lickEngine.draftEnd}
        captureIn={lickEngine.captureIn}
        captureOut={lickEngine.captureOut}
        clearDraft={lickEngine.clearDraft}
        mutateTrack={mutateTrack}
        replaceTrack={replaceTrack}
      />
    </div>
  );
}
