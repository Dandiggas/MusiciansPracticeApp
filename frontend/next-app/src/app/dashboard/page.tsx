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
  MusicNote,
  PianoKeys,
  type IconProps,
} from "@phosphor-icons/react";
import {
  getAllProjects,
  migrateFromLegacySetup,
  INSTRUMENTS,
  type InstrumentName,
  type InstrumentProject,
} from "@/lib/practice-session-store";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";

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

const INSTRUMENT_ICONS: Record<InstrumentName, React.ComponentType<IconProps>> = {
  Guitar: Guitar,
  Bass: Guitar,
  Drums: MusicNote,
  Keys: PianoKeys,
};

const INSTRUMENT_COLORS: Record<InstrumentName, { text: string; bg: string }> = {
  Guitar: { text: "text-primary", bg: "bg-primary/[0.1] dark:bg-primary/[0.15]" },
  Bass: { text: "text-warm", bg: "bg-warm/[0.1] dark:bg-warm/[0.15]" },
  Drums: { text: "text-destructive", bg: "bg-destructive/[0.1] dark:bg-destructive/[0.15]" },
  Keys: { text: "text-success", bg: "bg-success/[0.1] dark:bg-success/[0.15]" },
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

/* ---- Double-bezel instrument card ---- */
function InstrumentCard({
  instrument,
  project,
  isMostRecent,
  isActive,
  isLarge,
  router,
}: {
  instrument: InstrumentName;
  project?: InstrumentProject;
  isMostRecent: boolean;
  isActive: boolean;
  isLarge?: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const Icon = INSTRUMENT_ICONS[instrument];
  const colors = INSTRUMENT_COLORS[instrument];
  return (
    <a
      href={`/practice-timer?instrument=${instrument}`}
      onClick={(e) => {
        e.preventDefault();
        router.push(
          isActive
            ? "/practice-timer"
            : `/practice-timer?instrument=${instrument}`
        );
      }}
      className="group block h-full"
    >
      {/* Outer shell */}
      <div className={`h-full rounded-[2rem] bg-black/[0.03] p-1.5 ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        isMostRecent
          ? "ring-primary/20 bg-primary/[0.04]"
          : "ring-black/[0.04] group-hover:ring-primary/10"
      } dark:bg-white/[0.03] dark:ring-white/[0.06] dark:group-hover:ring-primary/15`}>
        {/* Inner core */}
        <div className={`relative flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-card shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 ${
          isLarge ? "p-6 md:p-8" : "p-5"
        }`}>
          {isActive && (
            <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              In Progress
            </span>
          )}

          <div className={`inline-flex rounded-xl ${colors.bg} ${isLarge ? "p-3.5" : "p-2.5"}`}>
            <Icon size={isLarge ? 24 : 18} weight="regular" className={colors.text} />
          </div>

          <h2 className={`mt-4 font-bold tracking-tight text-foreground ${isLarge ? "text-2xl" : "text-lg"}`}>
            {instrument}
          </h2>

          {project ? (
            <div className="mt-3 space-y-1">
              {project.songTitle && (
                <p className={`font-semibold text-foreground ${isLarge ? "text-base" : "text-sm"}`}>
                  {project.songTitle}
                </p>
              )}
              {project.description && (
                <p className={`text-muted-foreground ${isLarge ? "text-sm line-clamp-3" : "text-sm line-clamp-1"}`}>
                  {project.description}
                </p>
              )}
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {formatRelativeDate(project.lastPracticedAt)}
              </p>
            </div>
          ) : (
            <p className={`mt-3 text-muted-foreground ${isLarge ? "text-base" : "text-sm"}`}>
              Tap to start your first {instrument.toLowerCase()} session.
            </p>
          )}

          <div className="mt-auto pt-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {project ? "Resume" : "Start"}
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRight size={12} weight="bold" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

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

  const weeklyGoalHours = 7;
  const weekProgress = stats ? Math.min((stats.week_hours / weeklyGoalHours) * 100, 100) : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="space-y-6">
          <div className="mx-auto grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 w-36 animate-pulse rounded-[2rem] bg-card" />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">Loading your practice room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const [firstInstrument, ...restInstruments] = INSTRUMENTS;

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-[100px]" />
      </div>

      <div className="container relative mx-auto px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-5xl space-y-10">

          {/* Active session banner */}
          {activeSession && (
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.default}
            >
              {/* Double-bezel banner */}
              <div className="rounded-2xl bg-primary/[0.04] p-1 ring-1 ring-primary/10">
                <div className="flex flex-col gap-4 rounded-[calc(1rem-0.25rem)] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                      Session in Progress
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {activeSession.instrument}
                      {activeSession.is_paused && " (paused)"}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    className="group"
                  >
                    Return to Session
                    <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                      <ArrowRight size={12} weight="bold" />
                    </span>
                  </Button>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* Hero section */}
          <StaggerReveal className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <StaggerItem className="md:max-w-[60%]">
              {/* Eyebrow */}
              <div className="inline-flex w-fit items-center rounded-full bg-primary/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                {isFirstTime ? "Welcome to The Shed" : "Welcome back"}
              </div>

              {isFirstTime ? (
                <>
                  <h1 className="mt-6 text-3xl font-bold tracking-tighter leading-[0.95] text-foreground md:text-5xl">
                    Your Practice Room
                  </h1>
                  <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                    Everything&apos;s set up. Pick an instrument to get started.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="mt-6 text-3xl font-bold tracking-tighter leading-[0.95] text-foreground md:text-5xl">
                    Practice makes permanent.{" "}
                    <span className="text-muted-foreground">Perfect practice makes perfect.</span>
                  </h1>

                  <div className="mt-8 flex flex-wrap gap-3">
                    {mostRecentInstrument && (
                      <Button
                        onClick={() =>
                          router.push(
                            activeSession
                              ? "/practice-timer"
                              : `/practice-timer?instrument=${mostRecentInstrument}`
                          )
                        }
                        className="group"
                      >
                        {activeSession ? "Resume Session" : "Resume Previous"}
                        <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                          <ArrowRight size={12} weight="bold" />
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => router.push("/practice-timer")}
                    >
                      New Session
                    </Button>
                  </div>
                </>
              )}
            </StaggerItem>

            {/* Streak widget — double-bezel */}
            {stats && !isFirstTime && (
              <StaggerItem className="flex-shrink-0">
                <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06] lg:w-56">
                  <div className="rounded-[calc(1rem-0.25rem)] bg-card p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Current Streak
                    </p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <Flame size={18} weight="regular" className="text-warm" />
                      <span className="font-mono tabular-nums text-3xl font-bold text-foreground">{stats.current_streak}</span>
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        <span>Weekly goal</span>
                        <span className="font-mono tabular-nums normal-case">{stats.week_hours.toFixed(1)}h / {weeklyGoalHours}h</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                          style={{ width: `${weekProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )}
          </StaggerReveal>

          {/* Instrument cards — asymmetric bento grid */}
          <StaggerReveal className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StaggerItem className="md:row-span-2">
              <InstrumentCard
                instrument={firstInstrument}
                project={projects[firstInstrument]}
                isMostRecent={firstInstrument === mostRecentInstrument}
                isActive={activeSession?.instrument?.toLowerCase() === firstInstrument.toLowerCase()}
                isLarge
                router={router}
              />
            </StaggerItem>
            {restInstruments.slice(0, 2).map((instrument) => (
              <StaggerItem key={instrument}>
                <InstrumentCard
                  instrument={instrument}
                  project={projects[instrument]}
                  isMostRecent={instrument === mostRecentInstrument}
                  isActive={activeSession?.instrument?.toLowerCase() === instrument.toLowerCase()}
                  router={router}
                />
              </StaggerItem>
            ))}
            {restInstruments[2] && (
              <StaggerItem className="md:col-span-2">
                <InstrumentCard
                  instrument={restInstruments[2]}
                  project={projects[restInstruments[2]]}
                  isMostRecent={restInstruments[2] === mostRecentInstrument}
                  isActive={activeSession?.instrument?.toLowerCase() === restInstruments[2].toLowerCase()}
                  router={router}
                />
              </StaggerItem>
            )}
          </StaggerReveal>

          {/* Stats footer — double-bezel cards */}
          {stats && (
            <StaggerReveal className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr]">
              <StaggerItem>
                <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                  <div className="flex items-center gap-3 rounded-[calc(1rem-0.25rem)] bg-card px-6 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <Clock size={18} weight="regular" className="text-primary" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums text-2xl font-bold text-foreground">{stats.total_hours.toFixed(1)}h</span>
                      <span className="ml-2">total practice</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                  <div className="flex items-center gap-3 rounded-[calc(1rem-0.25rem)] bg-card px-6 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <Flame size={18} weight="regular" className="text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums text-lg font-bold text-foreground">{stats.current_streak}</span>
                      <span className="ml-1">day streak</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                  <div className="flex items-center gap-3 rounded-[calc(1rem-0.25rem)] bg-card px-6 py-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                    <MusicNote size={18} weight="regular" className="text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <span>Favorite: </span>
                      <span className="font-semibold text-foreground">{stats.favorite_instrument || "\u2014"}</span>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            </StaggerReveal>
          )}
        </div>
      </div>
    </div>
  );
}
