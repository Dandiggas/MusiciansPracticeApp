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
      className={`group relative flex flex-col rounded-xl bg-card transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        isLarge ? "p-6 md:p-8" : "p-5"
      } ${
        isMostRecent ? "ring-1 ring-primary/30 shadow-md" : ""
      } h-full`}
    >
      {isActive && (
        <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          In Progress
        </span>
      )}

      <div className={`inline-flex rounded-lg bg-muted ${isLarge ? "p-4" : "p-3"}`}>
        <Icon size={isLarge ? 28 : 20} weight="regular" className="text-primary" />
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
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            {formatRelativeDate(project.lastPracticedAt)}
          </p>
        </div>
      ) : (
        <p className={`mt-3 text-muted-foreground ${isLarge ? "text-base" : "text-sm"}`}>
          Tap to start your first {instrument.toLowerCase()} session.
        </p>
      )}

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:underline">
          {project ? "Resume" : "Start"}
          <ArrowRight size={20} weight="regular" />
        </span>
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

  // Weekly goal: 7 hours default
  const weeklyGoalHours = 7;
  const weekProgress = stats ? Math.min((stats.week_hours / weeklyGoalHours) * 100, 100) : 0;

  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // Prepare instrument data for bento grid
  const [firstInstrument, ...restInstruments] = INSTRUMENTS;

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Active session banner */}
          {activeSession && (
            <MotionDiv
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.default}
            >
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
                    className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Return to Session
                    <ArrowRight size={20} weight="regular" className="ml-2" />
                  </Button>
                </div>
              </div>
            </MotionDiv>
          )}

          {/* Hero section — left-aligned with streak widget on the right */}
          <StaggerReveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <StaggerItem className="md:max-w-[60%]">
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
                        className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {activeSession ? "Resume Session" : "Resume Previous Session"}
                        <ArrowRight size={20} weight="regular" className="ml-2" />
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
            </StaggerItem>

            {/* Streak widget */}
            {stats && !isFirstTime && (
              <StaggerItem className="flex-shrink-0">
                <div className="rounded-xl bg-card p-5 lg:w-56">
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Current Streak
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <Flame size={20} weight="regular" className="text-primary" />
                    <span className="font-mono tabular-nums text-3xl font-bold text-foreground">{stats.current_streak}</span>
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Weekly goal</span>
                      <span className="font-mono tabular-nums">{stats.week_hours.toFixed(1)}h / {weeklyGoalHours}h</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                        style={{ width: `${weekProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )}
          </StaggerReveal>

          {/* Instrument cards — asymmetric bento grid */}
          <StaggerReveal className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* First instrument gets large card spanning 2 rows */}
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
            {/* Remaining instruments in smaller cards */}
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
            {/* Fourth instrument spans bottom 2 columns */}
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

          {/* Stats footer — asymmetric grid */}
          {stats && (
            <StaggerReveal className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mt-8">
              <StaggerItem>
                <div className="flex items-center gap-3 rounded-xl bg-card px-6 py-4">
                  <Clock size={20} weight="regular" className="text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums text-2xl font-bold text-foreground">{stats.total_hours.toFixed(1)}h</span>
                    <span className="ml-2">total practice</span>
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="flex items-center gap-3 rounded-xl bg-card px-6 py-4">
                  <Flame size={20} weight="regular" className="text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums text-lg font-bold text-foreground">{stats.current_streak}</span>
                    <span className="ml-1">day streak</span>
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="flex items-center gap-3 rounded-xl bg-card px-6 py-4">
                  <MusicNote size={20} weight="regular" className="text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    <span>Favorite: </span>
                    <span className="font-semibold text-foreground">{stats.favorite_instrument || "\u2014"}</span>
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
