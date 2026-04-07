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
  saveStoredSessionSnapshot,
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

const INSTRUMENT_ICONS: Record<InstrumentName, typeof Guitar> = {
  Guitar: Guitar,
  Bass: Guitar,
  Drums: Drum,
  Keys: Piano,
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
  const [resumingInstrument, setResumingInstrument] = useState<string | null>(null);
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

  // Weekly goal: 7 hours default
  const weeklyGoalHours = 7;
  const weekProgress = stats ? Math.min((stats.week_hours / weeklyGoalHours) * 100, 100) : 0;

  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-6">
          <div className="mx-auto grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 w-36 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">Loading your practice room...</p>
        </div>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Active session banner */}
          {activeSession && (
            <div
              role="alert"
              className="rounded-xl bg-card p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">
                    Session in Progress
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {activeSession.instrument}
                    {activeSession.is_paused && " (paused)"}
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/practice-timer")}
                  className="h-11 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground hover:opacity-90"
                >
                  Return to Session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Header section with streak widget */}
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                {isFirstTime ? "Welcome to The Shed" : "Welcome back, Maestro"}
              </p>
              {isFirstTime ? (
                <>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    Your Practice Room
                  </h1>
                  <p className="mt-2 max-w-lg text-base text-muted-foreground">
                    Everything&apos;s set up. Pick an instrument to get started.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    Practice makes permanent, but{" "}
                    <em className="text-primary">perfect</em> practice makes perfect.
                  </h1>

                  {/* CTAs */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {mostRecentInstrument && (
                      <Button
                        onClick={() =>
                          router.push(
                            activeSession
                              ? "/practice-timer"
                              : `/practice-timer?instrument=${mostRecentInstrument}`
                          )
                        }
                        className="h-11 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground hover:opacity-90"
                      >
                        {activeSession ? "Resume Session" : "Resume Previous Session"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => router.push("/practice-timer")}
                      className="h-11 rounded-lg bg-secondary text-secondary-foreground hover:opacity-90"
                    >
                      New Session
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Streak widget */}
            {stats && !isFirstTime && (
              <div className="flex-shrink-0 rounded-xl bg-card p-5 lg:w-56">
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Current Streak
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <Flame className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold text-foreground">{stats.current_streak}</span>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Weekly goal</span>
                    <span>{stats.week_hours.toFixed(1)}h / {weeklyGoalHours}h</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                      style={{ width: `${weekProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instrument cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INSTRUMENTS.map((instrument) => {
              const project = projects[instrument];
              const Icon = INSTRUMENT_ICONS[instrument];
              const isMostRecent = instrument === mostRecentInstrument;
              const isActive =
                activeSession?.instrument?.toLowerCase() === instrument.toLowerCase();

              return (
                <div
                  key={instrument}
                  className={`group relative rounded-xl bg-card p-5 transition-all ${
                    isMostRecent
                      ? "ring-1 ring-primary/30 shadow-md"
                      : ""
                  }`}
                >
                  {isActive && (
                    <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      In Progress
                    </span>
                  )}

                  <div className="inline-flex rounded-lg bg-muted p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                    {instrument}
                  </h2>

                  {project ? (
                    <div className="mt-3 space-y-1">
                      {project.songTitle && (
                        <p className="text-sm font-semibold text-foreground">
                          {project.songTitle}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {project.description}
                        </p>
                      )}
                      {project.youtubeUrl && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.youtubeUrl}
                        </p>
                      )}
                      {project.mediaSource === "audio" && project.audioFileName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {project.audioFileName}
                        </p>
                      )}
                      {project.sheetMusicTitle && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-primary">♩</span>
                          {project.sheetMusicTitle}
                        </p>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        {formatRelativeDate(project.lastPracticedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Start your first {instrument.toLowerCase()} session.
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {project && (
                      <Button
                        size="sm"
                        disabled={resumingInstrument === instrument}
                        onClick={async () => {
                          if (isActive) {
                            router.push("/practice-timer");
                            return;
                          }
                          setResumingInstrument(instrument);
                          setError("");
                          const token = localStorage.getItem("token");
                          try {
                            const res = await axios.post(
                              `${apiBaseUrl}/timer/start/`,
                              {
                                instrument: project.instrument,
                                description: project.description || "",
                                youtube_url: project.youtubeUrl || "",
                              },
                              { headers: { Authorization: `Token ${token}` } }
                            );
                            saveStoredSessionSnapshot({
                              status: "active",
                              sessionId: res.data.session_id,
                              instrument: project.instrument,
                              description: project.description || "",
                              mediaSource: project.mediaSource || "youtube",
                              youtubeUrl: project.youtubeUrl || "",
                              audioFileName: project.audioFileName,
                            });
                            router.push(`/practice-timer?resume=1&instrument=${instrument}`);
                          } catch (err) {
                            if (axios.isAxiosError(err) && err.response?.data?.error) {
                              setError(err.response.data.error);
                            } else {
                              setError("Failed to start session. Please try again.");
                            }
                            setResumingInstrument(null);
                          }
                        }}
                        className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground text-xs h-8"
                      >
                        {resumingInstrument === instrument ? "Starting..." : isActive ? "Return" : "Resume"}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={project ? "secondary" : "default"}
                      onClick={() => router.push(`/practice-timer?instrument=${instrument}&new=1`)}
                      className={`rounded-lg text-xs h-8 ${
                        !project ? "bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground" : ""
                      }`}
                    >
                      New Session
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          {stats && (
            <div className="flex flex-wrap items-center justify-center gap-6 rounded-xl bg-card px-6 py-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.total_hours.toFixed(1)}h</span>
                total
              </div>
              <div className="h-4 w-px bg-muted" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.current_streak}</span>
                day streak
              </div>
              <div className="h-4 w-px bg-muted" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music className="h-4 w-4 text-muted-foreground" />
                Favorite:
                <span className="font-semibold text-foreground">{stats.favorite_instrument || "\u2014"}</span>
              </div>
              <div className="hidden h-4 w-px bg-muted sm:block" />
              <button
                onClick={() => router.push("/profilepage")}
                className="text-sm font-semibold text-primary hover:underline"
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
