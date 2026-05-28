"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const transportRef = useRef(transport);
  transportRef.current = transport;
  const normalizeSpeedRef = useRef(normalizeSpeed);
  normalizeSpeedRef.current = normalizeSpeed;
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
    const nextSpeed = normalizeSpeedRef.current(
      activeLick?.last_speed ?? trackLastSpeed ?? 1
    );
    setSpeed(nextSpeed);
    transportRef.current.setSpeed(nextSpeed);

    if (activeLick) {
      transportRef.current.seek(activeLick.start_seconds);
      setDraftStart(activeLick.start_seconds);
      setDraftEnd(activeLick.end_seconds);
    }
  }, [activeLick, trackLastSpeed]);

  useEffect(() => {
    transportRef.current.setSpeed(normalizeSpeedRef.current(speed));
  }, [speed]);

  useEffect(() => {
    const currentTransport = transportRef.current;

    if (!activeLick || !currentTransport.isPlaying) {
      return;
    }

    if (currentTransport.currentTime >= activeLick.end_seconds) {
      currentTransport.seek(activeLick.start_seconds);
    }
  }, [activeLick, transport.currentTime, transport.isPlaying]);

  useEffect(() => {
    const persistedSpeed = normalizeSpeedRef.current(
      activeLick?.last_speed ?? trackLastSpeed ?? 1
    );
    const nextSpeed = normalizeSpeedRef.current(speed);

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
    captureIn: () => setDraftStart(transportRef.current.currentTime),
    captureOut: () => setDraftEnd(transportRef.current.currentTime),
    clearDraft: () => {
      setDraftStart(null);
      setDraftEnd(null);
    },
    toggleLick: (lickId: number) => {
      setActiveLickId((current) => (current === lickId ? null : lickId));
    },
  };
}
