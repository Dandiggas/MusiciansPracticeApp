"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Clock,
  FileAudio,
  Flame,
  Music,
  PauseCircle,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  getStoredPracticeSetup,
  getStoredRecommendation,
  getStoredSessionSnapshot,
  type StoredPracticeSetup,
  type StoredRecommendation,
  type StoredSessionSnapshot,
} from "@/lib/practice-session-store";

interface Stats {
  total_hours: number;
  total_sessions: number;
  week_hours: number;
  current_streak: number;
  favorite_instrument: string;
}

interface Session {
  session_id: number;
  display_id?: number;
  instrument: string;
  description: string;
  session_date: string;
  youtube_url?: string;
}

const formatDateLabel = (value?: string) => {
  if (!value) return "just now";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const trimText = (value: string, limit = 88) => {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1)}...`;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [storedSetup, setStoredSetup] = useState<StoredPracticeSetup | null>(null);
  const [sessionSnapshot, setSessionSnapshot] =
    useState<StoredSessionSnapshot | null>(null);
  const [lastRecommendation, setLastRecommendation] =
    useState<StoredRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    const syncStoredState = () => {
      setStoredSetup(getStoredPracticeSetup());
      setSessionSnapshot(getStoredSessionSnapshot());
      setLastRecommendation(getStoredRecommendation());
    };

    syncStoredState();
    window.addEventListener("focus", syncStoredState);
    return () => window.removeEventListener("focus", syncStoredState);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [statsResponse, sessionsResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/stats/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          axios.get(`${apiBaseUrl}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        setStats(statsResponse.data);
        setSessions(sessionsResponse.data);
      } catch (requestError) {
        console.error("Error fetching dashboard data", requestError);
        setError("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboardData();
  }, [apiBaseUrl, router]);

  const latestSession = useMemo(() => {
    if (!sessions.length) return null;

    return [...sessions].sort((a, b) => {
      const dateDiff =
        new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.session_id || 0) - (a.session_id || 0);
    })[0];
  }, [sessions]);

  const isFirstTimeUser = useMemo(() => {
    if (!stats) return false;
    return (
      stats.total_sessions === 0 &&
      !storedSetup &&
      !sessionSnapshot &&
      !lastRecommendation
    );
  }, [lastRecommendation, sessionSnapshot, stats, storedSetup]);

  const continueCard = useMemo(() => {
    if (sessionSnapshot?.status === "paused") {
      return {
        badge: "Paused Session",
        title: "Resume exactly where you stopped.",
        body: sessionSnapshot.description
          ? `${sessionSnapshot.instrument} · ${sessionSnapshot.description}`
          : sessionSnapshot.instrument,
        meta:
          sessionSnapshot.mediaSource === "audio" && sessionSnapshot.audioFileName
            ? `Local MP3: ${sessionSnapshot.audioFileName}`
            : sessionSnapshot.youtubeUrl
              ? "YouTube source still attached"
              : "Session timer is paused and ready",
        buttonLabel: "Resume Paused Session",
        href: "/practice-timer",
      };
    }

    if (sessionSnapshot?.status === "active") {
      return {
        badge: "Active Session",
        title: "Your practice session is already live.",
        body: sessionSnapshot.description
          ? `${sessionSnapshot.instrument} · ${sessionSnapshot.description}`
          : sessionSnapshot.instrument,
        meta:
          sessionSnapshot.mediaSource === "audio" && sessionSnapshot.audioFileName
            ? `Local MP3: ${sessionSnapshot.audioFileName}`
            : sessionSnapshot.youtubeUrl
              ? "YouTube source still attached"
              : "Jump back into the workspace",
        buttonLabel: "Open Active Session",
        href: "/practice-timer",
      };
    }

    if (storedSetup) {
      return {
        badge: "Last Setup",
        title: "Continue the last setup you built.",
        body: storedSetup.description
          ? `${storedSetup.instrument} · ${storedSetup.description}`
          : storedSetup.instrument || "Saved practice setup",
        meta:
          storedSetup.mediaSource === "audio" && storedSetup.audioFileName
            ? `Last MP3: ${storedSetup.audioFileName} · re-upload to restore the track`
            : storedSetup.youtubeUrl
              ? "Saved YouTube source ready to load"
              : "Setup saved without a media source",
        buttonLabel: "Continue Last Setup",
        href:
          storedSetup.mediaSource === "audio" && storedSetup.audioFileName
            ? "/practice-timer"
            : "/practice-timer?resume=1",
      };
    }

    if (latestSession) {
      return {
        badge: "Last Session",
        title: "Restart from your most recent session.",
        body: latestSession.description
          ? `${latestSession.instrument} · ${latestSession.description}`
          : latestSession.instrument,
        meta: latestSession.youtube_url
          ? `From ${formatDateLabel(latestSession.session_date)} · YouTube source saved`
          : `From ${formatDateLabel(latestSession.session_date)} · session notes available`,
        buttonLabel: "Restart From History",
        href: latestSession.youtube_url ? "/practice-timer?resume=1" : "/practice-timer",
      };
    }

    return {
      badge: "Start Here",
      title: "Build your first practice flow.",
      body: "Create one session setup and the dashboard will keep bringing you back to it.",
      meta: "Add your instrument, choose YouTube or MP3, then press Start Practice.",
      buttonLabel: "Start First Session",
      href: "/practice-timer",
    };
  }, [latestSession, sessionSnapshot, storedSetup]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_84%_18%,_rgba(14,165,233,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_38%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.95)]">
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Your Practice Hub
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
                Practice should be easy to restart.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                The app should remember your flow, not make you rebuild it.
                See what state you left things in, jump back into the session,
                and keep the friction low.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Session State
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {sessionSnapshot?.status === "paused"
                      ? "Paused"
                      : sessionSnapshot?.status === "active"
                        ? "Active"
                        : storedSetup
                          ? "Saved"
                          : "Ready"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {sessionSnapshot?.status === "paused"
                      ? "resume anytime"
                      : sessionSnapshot?.status === "active"
                        ? "session is live"
                        : storedSetup
                          ? "last setup stored"
                          : "nothing blocking you"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Last Setup
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {storedSetup?.instrument || latestSession?.instrument || "None"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {storedSetup?.mediaSource === "audio"
                      ? "local MP3 workflow"
                      : storedSetup?.youtubeUrl || latestSession?.youtube_url
                        ? "YouTube-ready"
                        : "needs a source"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Last Recommendation
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {lastRecommendation ? "Saved" : "None"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {lastRecommendation
                      ? lastRecommendation.skillLevel
                      : "generate one when you need direction"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    This Week
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {stats.week_hours.toFixed(1)}h
                  </p>
                  <p className="mt-1 text-sm text-slate-300">already logged</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Continue Last Session
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {continueCard.title}
                  </h2>
                </div>
                {sessionSnapshot?.status === "paused" ? (
                  <PauseCircle className="h-8 w-8 text-amber-700" />
                ) : (
                  <PlayCircle className="h-8 w-8 text-amber-700" />
                )}
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                <div className="inline-flex items-center rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {continueCard.badge}
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900">
                  {continueCard.body}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {continueCard.meta}
                </p>

                <div className="mt-5 grid gap-3">
                  <Button
                    onClick={() => router.push(continueCard.href)}
                    className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {continueCard.buttonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {lastRecommendation && (
                    <Button
                      onClick={() => router.push("/recommendations")}
                      variant="secondary"
                      className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-none hover:bg-slate-50"
                    >
                      Review Last Recommendation
                    </Button>
                  )}
                </div>
              </div>

              {storedSetup?.mediaSource === "audio" && storedSetup.audioFileName && (
                <div className="mt-4 rounded-[1.5rem] border border-sky-200 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.16),_transparent_40%),linear-gradient(180deg,_#f8fdff_0%,_#eff6ff_100%)] p-4">
                  <div className="flex items-start gap-3">
                    <FileAudio className="mt-0.5 h-5 w-5 text-sky-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Last local track: {storedSetup.audioFileName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        The setup is saved, but local MP3 files need to be re-uploaded when you come back.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Total Practice Hours"
              value={stats.total_hours.toFixed(1)}
              description="All-time practice time"
              icon={Clock}
            />
            <StatsCard
              title="This Week"
              value={`${stats.week_hours.toFixed(1)}h`}
              description={`${stats.total_sessions} total sessions`}
              icon={TrendingUp}
            />
            <StatsCard
              title="Current Streak"
              value={`${stats.current_streak} days`}
              description={
                stats.current_streak > 0
                  ? "Keep it going"
                  : "Start a new streak today"
              }
              icon={Flame}
            />
            <StatsCard
              title="Favorite Instrument"
              value={stats.favorite_instrument}
              description="Most practiced"
              icon={Music}
            />
          </section>

          {isFirstTimeUser ? (
            <section className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Start Here
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                First session? Make one clean pass through the flow.
              </h2>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">1. Build the session</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Pick your instrument, add a YouTube link or upload an MP3, and start the session.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">2. Save some momentum</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the timer, tuner, and media tools so the app has something meaningful to restore next time.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">3. Ask for a plan when needed</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Recommendations are there when you want focus, not when you already know what to practice.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => router.push("/practice-timer")}
                  className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  Start First Practice Session
                </Button>
                <Button
                  onClick={() => router.push("/recommendations")}
                  variant="secondary"
                  className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-none hover:bg-slate-50"
                >
                  Generate A First Recommendation
                </Button>
              </div>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
              <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Quick Actions
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <button
                    onClick={() => router.push("/practice-timer")}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Practice Session
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Open the all-in-one media workspace.
                    </p>
                  </button>
                  <button
                    onClick={() => router.push("/recommendations")}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Plan The Next Session
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Generate practice ideas before you start.
                    </p>
                  </button>
                  <button
                    onClick={() => router.push("/profilepage")}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Review History
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Dive into charts, sessions, and long-term trends.
                    </p>
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_38%),linear-gradient(180deg,_#fff_0%,_#fff7ed_100%)] p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Last Recommendation
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {lastRecommendation
                        ? "Keep your next plan visible."
                        : "Use recommendations when you need focus."}
                    </h2>
                  </div>
                  <Sparkles className="h-8 w-8 text-amber-700" />
                </div>

                {lastRecommendation ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {trimText(lastRecommendation.recommendation, 170)}
                    </p>
                    <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-white/80 p-5">
                      <p className="text-sm font-semibold text-slate-900">
                        {lastRecommendation.instrument} · {lastRecommendation.skillLevel}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {trimText(lastRecommendation.goals, 110)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-amber-700">
                        Saved {formatDateLabel(lastRecommendation.updatedAt)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-white/80 p-5">
                    <p className="text-sm font-semibold text-slate-900">
                      No saved recommendation yet.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      The best time to use recommendations is before a short session when you need a clear next move.
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => router.push("/recommendations")}
                  className="mt-5 h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  {lastRecommendation ? "Open Recommendations" : "Generate Recommendation"}
                </Button>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
