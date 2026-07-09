"use client";

import Image from "next/image";
import { useReducedMotion } from "framer-motion";

/**
 * Quiet cinematic band behind the sessions header. Reuses the login film
 * (already cached for anyone who signed in) under a heavy scrim so the
 * working surface stays calm; reduced-motion users get the poster frame.
 */
export function SessionsHero({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60">
      {reduce ? (
        <Image
          src="/landing/login-room-poster.jpg"
          alt=""
          fill
          aria-hidden="true"
          className="object-cover"
        />
      ) : (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/landing/login-room-poster.jpg"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/landing/login-room.mp4" type="video/mp4" />
        </video>
      )}
      {/* Heavy scrim: the film is atmosphere here, never competition */}
      <div aria-hidden="true" className="absolute inset-0 bg-background/75" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70"
      />
      <div className="relative px-6 py-8 md:px-8">{children}</div>
    </div>
  );
}
