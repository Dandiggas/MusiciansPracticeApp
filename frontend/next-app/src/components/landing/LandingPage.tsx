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

      {/* Hero: asymmetric split, layered product shots right */}
      <section className="mx-auto grid max-w-6xl gap-14 px-5 pb-24 pt-16 md:px-8 lg:grid-cols-[7fr_5fr] lg:items-center lg:gap-10 lg:pt-20">
        <div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="text-5xl font-black leading-[0.98] tracking-tighter md:text-7xl"
          >
            The practice room that remembers.
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
            className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[#a89f94]"
          >
            Songs, BPMs, loop regions, and takes stay exactly where you left
            them. Open a session and keep going.
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
          className="relative mx-auto w-full max-w-xl lg:max-w-none"
        >
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl border border-[#ece3d5]/[0.12] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)]">
              {reduce ? (
                <Image
                  src="/landing/room-poster.jpg"
                  alt="An empty rehearsal room: keyboards, amps, and mic stands set up and waiting"
                  width={1276}
                  height={720}
                  priority
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/landing/room-poster.jpg"
                  aria-label="An empty rehearsal room: keyboards, amps, and mic stands set up and waiting"
                  className="aspect-video w-full object-cover"
                >
                  <source src="/landing/room.mp4" type="video/mp4" />
                </video>
              )}
              {/* Scrim: seats the warm footage into the dark page without flattening it */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(22,19,15,0.42)_100%)] shadow-[inset_0_0_0_1px_rgba(236,227,213,0.06)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-2xl bg-gradient-to-t from-[#16130f]/55 to-transparent"
              />
            </div>
            <Image
              src="/landing/metronome-card.png"
              alt="The metronome that lives inside every session"
              width={680}
              height={928}
              priority
              className="absolute -bottom-9 -right-4 w-[34%] rotate-2 rounded-2xl border border-[#ece3d5]/[0.12] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] md:-bottom-10"
            />
          </div>
        </motion.div>
      </section>

      {/* Feature: licks, full-width stack */}
      <section className="border-t border-[#ece3d5]/[0.08] bg-[#1a1712]">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <Reveal>
            <h2 className="max-w-[22ch] text-3xl font-black tracking-tighter md:text-5xl">
              Loop the hard bars. Name them. Keep them.
            </h2>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-[#a89f94]">
              Mark an in and out point while the track plays, save it as a
              lick, and it waits on the bench with its own practice speed.
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
            alt="A list of practice sessions, each updated recently"
            width={1920}
            height={500}
            className="w-full rounded-2xl border border-[#ece3d5]/[0.1] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
            A bench you never have to clear.
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[#a89f94]">
            Each session is one long-lived workspace. The Lionel Richie study
            you opened last month still has its tracks, tempos, and loops in
            place tonight.
          </p>
        </Reveal>
      </section>

      {/* Tools: divided rows, no card grid */}
      <section className="border-t border-[#ece3d5]/[0.08] bg-[#1a1712]">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <Reveal>
            <h2 className="text-3xl font-black tracking-tighter md:text-5xl">
              The whole bench, one tab.
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
                <div className="grid gap-3 py-8 transition-colors hover:bg-[#ece3d5]/[0.02] md:grid-cols-[auto_minmax(0,18rem)_1fr] md:items-baseline md:gap-8">
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

      {/* Manifesto close */}
      <section className="mx-auto max-w-4xl px-5 py-28 text-center md:px-8">
        <Reveal>
          <h2 className="text-4xl font-black leading-[1.02] tracking-tighter md:text-6xl">
            Built by a working musician, for the hours nobody sees.
          </h2>
          <p className="mx-auto mt-6 max-w-[44ch] text-lg leading-relaxed text-[#a89f94]">
            No streaks, no badges, no feed. Just your material, set up the way
            you left it.
          </p>
          <div className="mt-10 flex justify-center">
            <PrimaryCta />
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#ece3d5]/[0.08]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 md:flex-row md:px-8">
          <span className="text-base font-extrabold tracking-tight">The Shed</span>
          <div className="flex items-center gap-6 text-sm text-[#a89f94]">
            <Link href="/login" className="transition-colors hover:text-[#ece7e1]">
              Log in
            </Link>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
