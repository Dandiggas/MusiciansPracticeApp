"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import PracticeChart from "../practice/PracticeChart";
import { PracticeCalendarHeatmap } from "../charts/CalendarHeatmap";
import { InstrumentBreakdown } from "../charts/InstrumentBreakdown";
import { Button } from "@/components/ui/button";
import { ArrowRight, YoutubeLogo } from "@phosphor-icons/react";
import { MotionDiv } from "@/components/ui/motion-wrapper";
import { AnimatePresence } from "framer-motion";

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
  const [instrumentFilter, setInstrumentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const uniqueInstruments = useMemo(() => {
    const instruments = new Set(sessions.map((s) => s.instrument));
    return Array.from(instruments).sort();
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return [...sessions]
      .filter((session) => {
        if (instrumentFilter !== "all" && session.instrument !== instrumentFilter) return false;
        if (dateFrom && session.session_date < dateFrom) return false;
        if (dateTo && session.session_date > dateTo) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesInstrument = session.instrument.toLowerCase().includes(q);
          const matchesDescription = session.description?.toLowerCase().includes(q);
          const matchesId = String(session.display_id ?? session.session_id).includes(q);
          if (!matchesInstrument && !matchesDescription && !matchesId) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.session_id || 0) - (a.session_id || 0);
      });
  }, [sessions, instrumentFilter, dateFrom, dateTo, searchQuery]);

  const clearFilters = useCallback(() => {
    setInstrumentFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  }, []);

  const hasActiveFilters = instrumentFilter !== "all" || dateFrom || dateTo || searchQuery;

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const token = localStorage.getItem("token") || "";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* ── Header ── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {username}.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
                {latestSession ? ` · last: ${latestSession.instrument} on ${latestSession.session_date}` : ""}
              </p>
            </div>
            {latestSession && (
              <Button
                onClick={() => router.push("/practice-timer")}
                size="sm"
              >
                Continue practicing
                <ArrowRight size={14} weight="bold" className="ml-1" />
              </Button>
            )}
          </div>

          {/* ── Latest session card (only if exists) ── */}
          {latestSession && (
            <div className="mt-8 rounded-xl border border-border/60 bg-card p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {latestSession.instrument}
                    {latestSession.description ? ` · ${latestSession.description}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Session #{latestSession.display_id ?? latestSession.session_id}
                    {latestSession.youtube_url && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <YoutubeLogo size={12} weight="regular" className="text-destructive" />
                        YouTube saved
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => router.push("/dashboard")}
                    size="sm"
                    variant="outline"
                  >
                    Dashboard
                  </Button>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    size="sm"
                  >
                    Practice
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── Heatmap ── */}
          <div className="mt-10">
            <h2 className="text-sm font-medium text-foreground">Practice rhythm</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Activity over the last year</p>
            <div className="mt-4 rounded-xl border border-border/60 bg-card p-5">
              <PracticeCalendarHeatmap token={token} apiBaseUrl={apiBaseUrl} />
            </div>
          </div>

          {/* ── Charts (side by side) ── */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-medium text-foreground">Time per session</h2>
              <div className="mt-3 rounded-xl border border-border/60 bg-card p-5">
                {sessions.length > 0 ? (
                  <div className="h-64">
                    <PracticeChart sessions={sessions} />
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Chart appears after your first few sessions.
                  </p>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-medium text-foreground">Instrument mix</h2>
              <div className="mt-3 rounded-xl border border-border/60 bg-card p-5">
                <InstrumentBreakdown token={token} apiBaseUrl={apiBaseUrl} days={30} />
              </div>
            </div>
          </div>

          {/* ── Session archive ── */}
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">All sessions</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Filters */}
            {sessions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {["all", ...uniqueInstruments].map((inst) => (
                  <button
                    key={inst}
                    onClick={() => setInstrumentFilter(inst)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                      instrumentFilter === inst
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {inst === "all" ? "All" : inst}
                  </button>
                ))}

                <div className="ml-auto flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 w-32 rounded-lg border-border/60 bg-background px-2 text-xs"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 w-32 rounded-lg border-border/60 bg-background px-2 text-xs"
                    placeholder="To"
                  />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 w-40 rounded-lg border-border/60 bg-background px-2 text-xs"
                  />
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <p className="mt-2 text-xs text-muted-foreground font-mono tabular-nums">
                {filteredSessions.length} of {sessions.length}
              </p>
            )}

            {/* Session list */}
            <div className="mt-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-12 text-center">
                  <p className="text-sm text-muted-foreground">No sessions yet.</p>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    size="sm"
                    className="mt-3"
                  >
                    Start your first session
                  </Button>
                </div>
              ) : filteredSessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No sessions match your filters.
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredSessions.map((session) => (
                    <MotionDiv
                      key={session.session_id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    >
                      <div className="flex items-center gap-4 rounded-lg border border-border/40 px-4 py-3 transition-colors duration-200 hover:bg-muted/40">
                        <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          #{session.display_id ?? session.session_id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {session.instrument}
                            {session.description ? ` · ${session.description}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.session_date} · {session.duration}
                          </p>
                        </div>
                        {session.youtube_url && (
                          <a
                            href={session.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <YoutubeLogo size={16} weight="regular" />
                          </a>
                        )}
                      </div>
                    </MotionDiv>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  );
};

export default ProfilePage;
