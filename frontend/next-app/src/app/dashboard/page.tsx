"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Clock,
  Flame,
  Guitar,
  Music,
  Piano,
  Drum,
} from "lucide-react";
import {
  getAllProjects,
  migrateFromLegacySetup,
  INSTRUMENTS,
  type InstrumentName,
  type InstrumentProject,
} from "@/lib/practice-session-store";

interface Stats {
  total_hours: number;
  total_sessions: number;
  week_hours: number;
  current_streak: number;
  favorite_instrument: string;
}

interface ActiveSession {
  session_id: number;
  instrument: string;
  started_at: string;
  is_paused: boolean;
}

const INSTRUMENT_CONFIG: Record<
  InstrumentName,
  { icon: typeof Guitar; accentBg: string; accentBorder: string; accentText: string }
> = {
  Guitar: {
    icon: Guitar,
    accentBg: "bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_42%),linear-gradient(180deg,_#fff_0%,_#fffbeb_100%)]",
    accentBorder: "border-amber-200",
    accentText: "text-amber-700",
  },
  Bass: {
    icon: Guitar,
    accentBg: "bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_42%),linear-gradient(180deg,_#fff_0%,_#f0f9ff_100%)]",
    accentBorder: "border-sky-200",
    accentText: "text-sky-700",
  },
  Drums: {
    icon: Drum,
    accentBg: "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.12),_transparent_42%),linear-gradient(180deg,_#fff_0%,_#fff1f2_100%)]",
    accentBorder: "border-rose-200",
    accentText: "text-rose-700",
  },
  Keys: {
    icon: Piano,
    accentBg: "bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_42%),linear-gradient(180deg,_#fff_0%,_#ecfdf5_100%)]",
    accentBorder: "border-emerald-200",
    accentText: "text-emerald-700",
  },
};

const formatRelativeDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [projects, setProjects] = useState<Partial<Record<InstrumentName, InstrumentProject>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    migrateFromLegacySetup();
    setProjects(getAllProjects());
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [statsRes, activeRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/stats/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          axios.get(`${apiBaseUrl}/timer/active/`, {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        setStats(statsRes.data);
        if (activeRes.data.active) {
          setActiveSession(activeRes.data.session);
        }
      } catch (requestError) {
        console.error("Error fetching dashboard data", requestError);
        setError("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [apiBaseUrl, router]);

  const mostRecentInstrument = useMemo(() => {
    let latest: InstrumentName | null = null;
    let latestTime = 0;
    for (const instrument of INSTRUMENTS) {
      const project = projects[instrument];
      if (project?.lastPracticedAt) {
        const time = new Date(project.lastPracticedAt).getTime();
        if (time > latestTime) {
          latestTime = time;
          latest = instrument;
        }
      }
    }
    return latest;
  }, [projects]);

  const isFirstTime = useMemo(
    () => Object.keys(projects).length === 0 && stats?.total_sessions === 0,
    [projects, stats]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffdf7_0%,_#fff_38%,_#f8fafc_100%)]">
        <div className="space-y-4">
          <div className="mx-auto grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 w-32 animate-pulse rounded-[2rem] bg-slate-200" />
            ))}
          </div>
          <p className="text-center text-sm text-slate-500">Loading your practice room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_84%_18%,_rgba(14,165,233,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_38%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Active session banner */}
          {activeSession && (
            <div
              role="alert"
              className="rounded-[2rem] border border-amber-200 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_40%),linear-gradient(180deg,_#fffbeb_0%,_#fff7ed_100%)] p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Session in Progress
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {activeSession.instrument}
                    {activeSession.is_paused && " (paused)"}
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/practice-timer")}
                  className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                >
                  Return to Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              {isFirstTime ? "Your Practice Room" : "Pick up where you left off."}
            </h1>
            {isFirstTime && (
              <p className="mx-auto mt-3 max-w-lg text-base text-slate-600">
                Everything&apos;s set up. Pick an instrument to get started.
              </p>
            )}
          </div>

          {/* Instrument cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INSTRUMENTS.map((instrument) => {
              const project = projects[instrument];
              const config = INSTRUMENT_CONFIG[instrument];
              const Icon = config.icon;
              const isMostRecent = instrument === mostRecentInstrument;
              const isActive =
                activeSession?.instrument?.toLowerCase() === instrument.toLowerCase();

              return (
                <a
                  key={instrument}
                  href={`/practice-timer?instrument=${instrument}`}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(
                      isActive
                        ? "/practice-timer"
                        : `/practice-timer?instrument=${instrument}`
                    );
                  }}
                  className={`group relative rounded-[2rem] border p-5 transition-all hover:-translate-y-1 hover:shadow-[0_20px_80px_-55px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${config.accentBg} ${config.accentBorder} ${
                    isMostRecent
                      ? "shadow-[0_20px_80px_-55px_rgba(15,23,42,0.35)] ring-2 ring-slate-950/10"
                      : "shadow-sm"
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-4 top-4 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      In Progress
                    </span>
                  )}

                  <div className={`inline-flex rounded-2xl p-3 ${config.accentBorder} border bg-white/80`}>
                    <Icon className={`h-6 w-6 ${config.accentText}`} />
                  </div>

                  <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">
                    {instrument}
                  </h2>

                  {project ? (
                    <div className="mt-3 space-y-1">
                      {project.songTitle && (
                        <p className="text-sm font-semibold text-slate-800">
                          {project.songTitle}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-sm text-slate-600 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {formatRelativeDate(project.lastPracticedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Tap to start your first {instrument.toLowerCase()} session.
                    </p>
                  )}

                  <div className="mt-4">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${config.accentText} group-hover:underline`}>
                      {project ? "Resume" : "Start"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-6 rounded-[2rem] border border-white/70 bg-white/80 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-900">{stats.total_hours.toFixed(1)}h</span>
                total
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Flame className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-slate-900">{stats.current_streak}</span>
                day streak
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Music className="h-4 w-4 text-slate-400" />
                Favorite:
                <span className="font-semibold text-slate-900">{stats.favorite_instrument || "—"}</span>
              </div>
              <div className="hidden h-4 w-px bg-slate-200 sm:block" />
              <button
                onClick={() => router.push("/profilepage")}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 hover:underline"
              >
                View history
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
