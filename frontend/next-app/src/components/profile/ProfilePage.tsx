"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import PracticeChart from "../practice/PracticeChart";
import LogoutButton from "../practice/LogoutButton";
import { PracticeCalendarHeatmap } from "../charts/CalendarHeatmap";
import { InstrumentBreakdown } from "../charts/InstrumentBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, History, PlayCircle, Youtube } from "lucide-react";

interface Session {
  session_id: number;
  display_id?: number;
  user: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
  youtube_url?: string;
}

const ProfilePage = () => {
  const [username, setUsername] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const [userResponse, sessionResponse] = await Promise.all([
          axios.get(`${apiBaseUrl}/current-user/`, {
            headers: { Authorization: `Token ${token}` },
          }),
          axios.get(`${apiBaseUrl}/`, {
            headers: { Authorization: `Token ${token}` },
          }),
        ]);

        setUsername(userResponse.data.username);
        setSessions(sessionResponse.data);
      } catch (requestError) {
        console.error("Error fetching data", requestError);
        setError("Error fetching data");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading your history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem("token") || "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_84%_18%,_rgba(14,165,233,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_38%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-12 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.95)]">
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Practice History
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
                Welcome back, {username}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Review your recent work, spot your momentum, and jump back into
                the next session without losing context.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Sessions
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {sessions.length}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">recorded so far</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Latest
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {latestSession?.instrument || "None"}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">most recent focus</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Workflow
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">Resume</p>
                  <p className="mt-1 text-sm text-slate-300">from the dashboard</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/86 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Next Move
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    Continue from your latest work
                  </h2>
                </div>
                <PlayCircle className="h-8 w-8 text-amber-700" />
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                {latestSession ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {latestSession.instrument}
                        {latestSession.description
                          ? ` · ${latestSession.description}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Session #{latestSession.display_id ?? latestSession.session_id} on{" "}
                        {latestSession.session_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      {latestSession.youtube_url ? (
                        <>
                          <Youtube className="h-4 w-4 text-red-500" />
                          YouTube source saved in that session
                        </>
                      ) : (
                        <>
                          <History className="h-4 w-4 text-slate-500" />
                          Session notes and setup available to reuse
                        </>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        onClick={() => router.push("/dashboard")}
                        className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                      >
                        Continue From Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => router.push("/practice-timer")}
                        variant="secondary"
                        className="h-11 rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-none hover:bg-slate-50"
                      >
                        Open Practice Session
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      No history yet. Start a session and this page will become
                      your review and restart space.
                    </p>
                    <Button
                      onClick={() => router.push("/practice-timer")}
                      className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                    >
                      Start First Practice Session
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <LogoutButton />
              </div>
            </div>
          </section>

          <section className="grid gap-6">
            <Card className="border-white/70 bg-white/86 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl text-slate-950">
                  Practice Rhythm
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PracticeCalendarHeatmap token={token} apiBaseUrl={apiBaseUrl} />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-white/70 bg-white/86 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Time Over Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {sessions.length > 0 ? (
                    <div className="h-80">
                      <PracticeChart sessions={sessions} />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      No chart data yet. Log a few sessions and this view will come alive.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/70 bg-white/86 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Instrument Mix
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InstrumentBreakdown token={token} apiBaseUrl={apiBaseUrl} days={30} />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/86 p-6 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Session Archive
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Your recorded sessions
                </h2>
              </div>
              <Button
                onClick={() => router.push("/practice-timer")}
                className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              >
                Start Another Session
              </Button>
            </div>

            <div className="mt-6 grid gap-4">
              {sessions.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
                  No sessions yet. Start your first practice session and your history will show up here.
                </div>
              ) : (
                [...sessions]
                  .sort((a, b) => {
                    const dateDiff =
                      new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
                    if (dateDiff !== 0) return dateDiff;
                    return (b.session_id || 0) - (a.session_id || 0);
                  })
                  .map((session) => (
                    <div
                      key={session.session_id}
                      className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:bg-white md:grid-cols-[110px_1fr_120px_140px]"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Session
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-950">
                          #{session.display_id ?? session.session_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {session.instrument}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {session.description || "No description recorded"}
                        </p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                          {session.session_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Duration
                        </p>
                        <p className="mt-2 font-mono text-sm font-semibold text-slate-900">
                          {session.duration}
                        </p>
                      </div>
                      <div className="flex items-center md:justify-end">
                        {session.youtube_url ? (
                          <a
                            href={session.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                          >
                            <Youtube className="mr-2 h-4 w-4 text-red-500" />
                            View Source
                          </a>
                        ) : (
                          <span className="text-sm text-slate-500">No video saved</span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
