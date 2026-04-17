"use client";

import { SpeakerHigh, SpeakerLow, SpeakerX } from "@phosphor-icons/react";

export interface VolumeIconProps {
  volume: number; // 0..1
  size?: number;
  className?: string;
}

export function VolumeIcon({
  volume,
  size = 16,
  className,
}: VolumeIconProps) {
  if (volume === 0) {
    return (
      <SpeakerX
        size={size}
        className={className}
        data-testid="volume-icon-muted"
        aria-hidden
      />
    );
  }
  if (volume < 0.5) {
    return (
      <SpeakerLow
        size={size}
        className={className}
        data-testid="volume-icon-low"
        aria-hidden
      />
    );
  }
  return (
    <SpeakerHigh
      size={size}
      className={className}
      data-testid="volume-icon-high"
      aria-hidden
    />
  );
}
