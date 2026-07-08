"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Metronome, MusicNotesSimple, Waveform } from "@phosphor-icons/react";

/*
 * Logged-out landing. Committed dark studio look regardless of app theme:
 * this page is the record sleeve, the app inside honours the toggle.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const CTA_LABEL = "Create your Shed";

function PrimaryCta({ size = "lg" }: { size?: "lg" | "md" }) {
  return (
    <Link
      href="/register"
      className={`group inline-flex items-center gap-2 rounded-lg bg-[#3aa392] font-semibold text-[#07120f] transition-all duration-200 hover:bg-[#46b5a3] active:scale-[0.98] ${
        size === "lg" ? "px-7 py-4 text-base" : "px-5 py-3 text-sm"
      }`}
    >
      {CTA_LABEL}
      <ArrowRight
        size={size === "lg" ? 18 : 15}
        weight="bold"
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-[100dvh] bg-[#16130f] text-[#ece7e1] selection:bg-[#3aa392]/30">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-[#ece3d5]/[0.08] bg-[#16130f]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <span className="text-lg font-extrabold tracking-tight">The Shed</span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#a89f94] transition-colors hover:bg-[#2a251f] hover:text-[#ece7e1]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#3aa392] px-4 py-2 text-sm font-semibold text-[#07120f] transition-colors hover:bg-[#46b5a3] active:scale-[0.98]"
            >
              {CTA_LABEL}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero: asymmetric split, legible product UI right */}
      <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-24 pt-16 md:px-8 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-10 lg:pt-20">
        <div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-balance text-5xl font-black leading-[0.98] tracking-tighter md:text-7xl"
          >
            A saved practice room for your songs.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
            className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[#a89f94]"
          >
            The Shed is for musicians rehearsing real material: each song keeps
            its audio, chart, tempo, loop points, notes, and takes in one place.
            Open the session later and keep going. Free.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.22, ease: EASE }}
            className="mt-9"
          >
            <PrimaryCta />
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative">
            <Image
              src="/landing/tracks-rail.png"
              alt="A session's track list in The Shed"
              width={640}
              height={582}
              priority
              className="w-[72%] rounded-2xl border border-[#ece3d5]/[0.1] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
            />
            <Image
              src="/landing/metronome-card.png"
              alt="The metronome that lives inside every session"
              width={680}
              height={928}
              priority
              className="absolute -bottom-10 right-0 w-[52%] rotate-2 rounded-2xl border border-[#ece3d5]/[0.12] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]"
            />
          </div>
        </motion.div>
      </section>

      {/* Feature: licks, full-width stack */}
      <section className="border-t border-[#ece3d5]/[0.08] bg-[#1a1712]">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <Reveal>
            <h2 className="max-w-[22ch] text-balance text-3xl font-black tracking-tighter md:text-5xl">
              Learn one song without rebuilding the setup.
            </h2>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-[#a89f94]">
              Add the YouTube video, mp3, or chart once. Save the awkward bars
              as named loops, slow them down, and come back to the same setup
              next time.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <Image
              src="/landing/licks-panel.png"
              alt="Saved loop regions: intro voicing run, chorus turnaround, outro comp pattern"
              width={1744}
              height={818}
              className="w-full rounded-2xl border border-[#ece3d5]/[0.1] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
            />
          </Reveal>
        </div>
      </section>

      {/* Feature: continuity, split image left / text right */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-24 md:px-8 lg:grid-cols-[6fr_5fr]">
        <Reveal>
          <Image
            src="/landing/sessions-list.png"
            alt="Practice sessions updated one day, two days, eight days, and twenty-two days ago"
            width={1920}
            height={668}
            className="w-full rounded-2xl border border-[#ece3d5]/[0.1] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-balance text-3xl font-black tracking-tighter md:text-5xl">
            Three weeks later, your practice desk is still set up.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[#a89f94]">
            Each session is a long-lived workspace for a song, set, or routine.
            The Sunday set you built last month opens tonight with its tracks,
            tempos, charts, and loops in place.
          </p>
        </Reveal>
      </section>

      {/* Tools: divided rows, no card grid */}
      <section className="border-t border-[#ece3d5]/[0.08] bg-[#1a1712]">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <Reveal>
            <h2 className="text-balance text-3xl font-black tracking-tighter md:text-5xl">
              The whole rig, one tab.
            </h2>
          </Reveal>
          <div className="mt-12 divide-y divide-[#ece3d5]/[0.08] border-y border-[#ece3d5]/[0.08]">
            {[
              {
                icon: <Metronome size={26} weight="regular" />,
                title: "A click that knows the song",
                body: "The metronome sits inside the session and loads each track's BPM the moment you select it.",
              },
              {
                icon: <MusicNotesSimple size={26} weight="regular" />,
                title: "YouTube, MP3s, and charts together",
                body: "Practise from a video, an mp3, or sheet music without rebuilding the setup every time.",
              },
              {
                icon: <Waveform size={26} weight="regular" />,
                title: "Takes that stay attached",
                body: "Record yourself against the track and the take lives with the song, ready to compare next week.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="grid gap-3 py-8 md:grid-cols-[auto_minmax(0,18rem)_1fr] md:items-baseline md:gap-8">
                  <span className="text-[#3aa392]">{item.icon}</span>
                  <h3 className="text-xl font-bold tracking-tight">{item.title}</h3>
                  <p className="max-w-[52ch] text-base leading-relaxed text-[#a89f94]">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Proof: real stages. The person behind the product, in photographs. */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Reveal>
          <h2 className="max-w-[20ch] text-balance text-3xl font-black tracking-tighter md:text-5xl">
            Made between soundchecks.
          </h2>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-[#a89f94]">
            The Shed is built by a working session keyboardist who practises
            for real stages. Every feature exists because a gig needed it.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:gap-5">
          <Reveal>
            <Image
              src="/landing/stage-crowd.jpg"
              alt="Behind the keys on a festival stage, looking out over the crowd"
              width={2048}
              height={1536}
              className="w-full rounded-2xl border border-[#ece3d5]/[0.1] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
            />
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr] md:gap-5">
            <Reveal delay={0.08}>
              <Image
                src="/landing/stage-nord.jpg"
                alt="Playing a Nord Stage 3 under stage lights"
                width={1600}
                height={1067}
                className="h-64 w-full rounded-2xl border border-[#ece3d5]/[0.1] object-cover shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] md:h-[420px]"
              />
            </Reveal>
            <Reveal delay={0.14}>
              <Image
                src="/landing/stage-mainstage.jpg"
                alt="Playing keys on a festival main stage"
                width={1100}
                height={1651}
                className="h-64 w-full rounded-2xl border border-[#ece3d5]/[0.1] object-cover shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] md:h-[420px]"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Close: the room, waiting. Full-bleed video with scrim. */}
      <section className="relative overflow-hidden border-t border-[#ece3d5]/[0.08]">
        {reduce ? (
          <Image
            src="/landing/room-poster.jpg"
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
            poster="/landing/room-poster.jpg"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/landing/room.mp4" type="video/mp4" />
          </video>
        )}
        {/* Scrim: keeps the type WCAG-readable over the warm footage */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#16130f]/72"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(22,19,15,0.55)_100%)]"
        />
        <div className="relative mx-auto max-w-4xl px-5 py-36 text-center md:px-8 md:py-44">
          <Reveal>
            <h2 className="text-balance text-4xl font-black leading-[1.02] tracking-tighter md:text-6xl">
              This is where you shed.
            </h2>
            <p className="mx-auto mt-6 max-w-[44ch] text-balance text-lg leading-relaxed text-[#cfc7bc]">
              Open it tomorrow. The music, tools, and notes are where you left
              them.
            </p>
            <div className="mt-10 flex justify-center">
              <PrimaryCta />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ece3d5]/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 md:flex-row md:px-8">
          <span className="text-base font-extrabold tracking-tight">The Shed</span>
          <div className="flex items-center gap-6 text-sm text-[#a89f94]">
            <Link href="/login" className="transition-colors hover:text-[#ece7e1]">
              Log in
            </Link>
            <span>© {new Date().getFullYear()} The Shed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
