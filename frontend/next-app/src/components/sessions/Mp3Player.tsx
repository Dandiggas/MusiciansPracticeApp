"use client";

import { useCallback } from "react";

import { LickPanel } from "@/components/sessions/LickPanel";
import { TransportControls } from "@/components/sessions/TransportControls";
import { useHtmlAudioTransport } from "@/hooks/useHtmlAudioTransport";
import { useLickEngine } from "@/hooks/useLickEngine";
import { updateLick, updateTrack } from "@/lib/api";
import { Track } from "@/types/session";


interface Mp3PlayerProps {
  mutateTrack: (updater: (track: Track) => Track) => void;
  replaceTrack: (track: Track) => void;
  track: Track;
}

export function Mp3Player({ mutateTrack, replaceTrack, track }: Mp3PlayerProps) {
  const { audioRef, transport } = useHtmlAudioTransport(track.file);

  const persistTrackSpeed = useCallback(
    async (speed: number) => {
      mutateTrack((current) => ({ ...current, last_speed: speed }));
      try {
        await updateTrack(track.id, { last_speed: speed });
      } catch {
        // Leave the optimistic value in place for now.
      }
    },
    [mutateTrack, track.id]
  );

  const persistLickSpeed = useCallback(
    async (lickId: number, speed: number) => {
      mutateTrack((current) => ({
        ...current,
        licks: current.licks.map((lick) =>
          lick.id === lickId ? { ...lick, last_speed: speed } : lick
        ),
      }));
      try {
        const updated = await updateLick(lickId, { last_speed: speed });
        mutateTrack((current) => ({
          ...current,
          licks: current.licks.map((lick) => (lick.id === updated.id ? updated : lick)),
        }));
      } catch {
        // Leave optimistic speed in place for now.
      }
    },
    [mutateTrack]
  );

  const lickEngine = useLickEngine({
    licks: track.licks,
    trackLastSpeed: track.last_speed,
    transport,
    normalizeSpeed: (speed) => Math.max(0.25, Math.min(1.25, Number(speed.toFixed(2)))),
    onPersistTrackSpeed: persistTrackSpeed,
    onPersistLickSpeed: persistLickSpeed,
  });

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.16),_transparent_55%),linear-gradient(135deg,rgba(7,10,11,0.96),rgba(20,29,31,0.92))] p-8">
          <div className="w-full max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
              MP3 practice
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
              {track.name}
            </h3>
            <p className="mt-2 text-sm text-white/70">
              Slow it down, store the tempo you last used, and loop any saved lick instantly.
            </p>
          </div>
        </div>

        <div className="p-5">
          <audio ref={audioRef} src={track.file ?? undefined} preload="metadata" className="hidden" />
          <TransportControls
            transport={transport}
            speed={lickEngine.speed}
            onSpeedChange={lickEngine.setSpeed}
            speedMin={0.25}
            speedMax={1.25}
            speedStep={0.05}
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
