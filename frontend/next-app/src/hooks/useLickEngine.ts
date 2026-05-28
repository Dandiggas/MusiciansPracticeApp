"use client";

import { useEffect, useMemo, useState } from "react";

import { Transport } from "@/hooks/transport";
import { Lick } from "@/types/session";


interface UseLickEngineArgs {
  licks: Lick[];
  trackLastSpeed: number | null;
  transport: Transport;
  normalizeSpeed: (speed: number) => number;
  onPersistTrackSpeed: (speed: number) => Promise<void> | void;
  onPersistLickSpeed: (lickId: number, speed: number) => Promise<void> | void;
}

export function useLickEngine({
  licks,
  trackLastSpeed,
  transport,
  normalizeSpeed,
  onPersistTrackSpeed,
  onPersistLickSpeed,
}: UseLickEngineArgs) {
  const [activeLickId, setActiveLickId] = useState<number | null>(null);
  const [speed, setSpeed] = useState(normalizeSpeed(trackLastSpeed ?? 1));
  const [draftStart, setDraftStart] = useState<number | null>(null);
  const [draftEnd, setDraftEnd] = useState<number | null>(null);

  const activeLick = useMemo(
    () => licks.find((lick) => lick.id === activeLickId) ?? null,
    [licks, activeLickId]
  );

  useEffect(() => {
    if (activeLickId !== null && !licks.some((lick) => lick.id === activeLickId)) {
      setActiveLickId(null);
    }
  }, [activeLickId, licks]);

  useEffect(() => {
    const nextSpeed = normalizeSpeed(
      activeLick?.last_speed ?? trackLastSpeed ?? 1
    );
    setSpeed(nextSpeed);
    transport.setSpeed(nextSpeed);

    if (activeLick) {
      transport.seek(activeLick.start_seconds);
      setDraftStart(activeLick.start_seconds);
      setDraftEnd(activeLick.end_seconds);
    }
  }, [activeLick, trackLastSpeed, transport, normalizeSpeed]);

  useEffect(() => {
    transport.setSpeed(normalizeSpeed(speed));
  }, [speed, transport, normalizeSpeed]);

  useEffect(() => {
    if (!activeLick || !transport.isPlaying) {
      return;
    }

    if (transport.currentTime >= activeLick.end_seconds) {
      transport.seek(activeLick.start_seconds);
    }
  }, [activeLick, transport]);

  useEffect(() => {
    const persistedSpeed = normalizeSpeed(
      activeLick?.last_speed ?? trackLastSpeed ?? 1
    );
    const nextSpeed = normalizeSpeed(speed);

    if (Math.abs(persistedSpeed - nextSpeed) < 0.001) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (activeLick) {
        void onPersistLickSpeed(activeLick.id, nextSpeed);
      } else {
        void onPersistTrackSpeed(nextSpeed);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [
    activeLick,
    onPersistLickSpeed,
    onPersistTrackSpeed,
    normalizeSpeed,
    speed,
    trackLastSpeed,
  ]);

  return {
    activeLick,
    activeLickId,
    draftEnd,
    draftStart,
    setActiveLickId,
    setDraftEnd,
    setDraftStart,
    setSpeed,
    speed,
    captureIn: () => setDraftStart(transport.currentTime),
    captureOut: () => setDraftEnd(transport.currentTime),
    clearDraft: () => {
      setDraftStart(null);
      setDraftEnd(null);
    },
    toggleLick: (lickId: number) => {
      setActiveLickId((current) => (current === lickId ? null : lickId));
    },
  };
}
