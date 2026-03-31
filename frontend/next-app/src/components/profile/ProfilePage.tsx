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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="mt-4 text-muted-foreground">Loading your history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem("token") || "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl bg-card p-8 text-card-foreground shadow-lg">
              <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Practice History
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-foreground md:text-6xl">
                Welcome back, {username}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Review your recent work, spot your momentum, and jump back into
                the next session without losing context.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Sessions
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {sessions.length}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">recorded so far</p>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Latest
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">
                    {latestSession?.instrument || "None"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">most recent focus</p>
                </div>
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Workflow
                  </p>
                  <p className="mt-2 text-2xl font-black text-foreground">Resume</p>
                  <p className="mt-1 text-sm text-muted-foreground">from the dashboard</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-card p-6 text-card-foreground shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Next Move
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    Continue from your latest work
                  </h2>
                </div>
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>

              <div className="mt-6 rounded-xl border border-border bg-secondary p-5">
                {latestSession ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {latestSession.instrument}
                        {latestSession.description
                          ? ` · ${latestSession.description}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Session #{latestSession.display_id ?? latestSession.session_id} on{" "}
                        {latestSession.session_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {latestSession.youtube_url ? (
                        <>
                          <Youtube className="h-4 w-4 text-destructive" />
                          YouTube source saved in that session
                        </>
                      ) : (
                        <>
                          <History className="h-4 w-4 text-muted-foreground" />
                          Session notes and setup available to reuse
                        </>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        onClick={() => router.push("/dashboard")}
                        className="h-11 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground hover:opacity-90"
                      >
                        Continue From Dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => router.push("/practice-timer")}
                        variant="secondary"
                        className="h-11 rounded-lg bg-secondary text-secondary-foreground shadow-none hover:opacity-80"
                      >
                        Open Practice Session
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No history yet. Start a session and this page will become
                      your review and restart space.
                    </p>
                    <Button
                      onClick={() => router.push("/practice-timer")}
                      className="h-11 w-full rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground hover:opacity-90"
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
            <Card className="rounded-xl border-border bg-card text-card-foreground shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">
                  Practice Rhythm
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PracticeCalendarHeatmap token={token} apiBaseUrl={apiBaseUrl} />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-xl border-border bg-card text-card-foreground shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">
                    Time Over Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {sessions.length > 0 ? (
                    <div className="h-80">
                      <PracticeChart sessions={sessions} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No chart data yet. Log a few sessions and this view will come alive.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border bg-card text-card-foreground shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">
                    Instrument Mix
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InstrumentBreakdown token={token} apiBaseUrl={apiBaseUrl} days={30} />
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="rounded-xl bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Session Archive
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                  Your recorded sessions
                </h2>
              </div>
              <Button
                onClick={() => router.push("/practice-timer")}
                className="h-11 rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground hover:opacity-90"
              >
                Start Another Session
              </Button>
            </div>

            <div className="mt-6 grid gap-4">
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary p-8 text-center text-muted-foreground">
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
                      className="grid gap-4 rounded-xl border border-border bg-secondary p-5 transition hover:bg-secondary/80 md:grid-cols-[110px_1fr_120px_140px]"
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          Session
                        </p>
                        <p className="mt-2 text-2xl font-black text-foreground">
                          #{session.display_id ?? session.session_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {session.instrument}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {session.description || "No description recorded"}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          {session.session_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          Duration
                        </p>
                        <p className="mt-2 font-mono text-sm font-semibold text-foreground">
                          {session.duration}
                        </p>
                      </div>
                      <div className="flex items-center md:justify-end">
                        {session.youtube_url ? (
                          <a
                            href={session.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary/80"
                          >
                            <Youtube className="mr-2 h-4 w-4 text-destructive" />
                            View Source
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">No video saved</span>
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
