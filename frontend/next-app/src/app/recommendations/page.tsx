"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { saveStoredRecommendation } from "@/lib/practice-session-store";

const GOAL_PRESETS = [
  "Tighten rhythm and timing",
  "Memorize a song section",
  "Clean up chord changes",
  "Improve improvisation ideas",
];
const GOALS_MAX_CHARS = 240;

export default function RecommendationsPage() {
  const router = useRouter();
  const [instrument, setInstrument] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [goals, setGoals] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setRecommendation("");
    setIsCachedResult(false);
    setIsLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (goals.trim().length > GOALS_MAX_CHARS) {
      setError(`Keep your goal to ${GOALS_MAX_CHARS} characters or fewer.`);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/recommendations/`,
        { instrument, skill_level: skillLevel, goals },
        { headers: { Authorization: `Token ${token}` } }
      );
      setRecommendation(response.data.recommendation);
      setIsCachedResult(Boolean(response.data.cached));
      saveStoredRecommendation({
        instrument,
        skillLevel,
        goals: goals.trim(),
        recommendation: response.data.recommendation,
        cached: Boolean(response.data.cached),
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (typeof err.response?.data?.detail === "string") {
          setError(err.response.data.detail);
        } else if (typeof err.response?.data?.error === "string") {
          setError(err.response.data.error);
        } else if (err.code === "ECONNABORTED") {
          setError("The recommendation request timed out. Please try again.");
        } else {
          setError("Failed to get recommendation. Please try again.");
        }
      } else {
        setError("Failed to get recommendation. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectClassName =
    "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-none outline-none focus:ring-2 focus:ring-slate-300";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(14,165,233,0.14),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_40%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="container relative mx-auto max-w-6xl p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="rounded-[2rem] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_35px_100px_-55px_rgba(15,23,42,0.95)]">
            <div className="inline-flex items-center rounded-full border border-white/12 bg-white/8 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Session Planning
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Decide what matters before you press play.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Recommendations belong before the session starts. Use this page to
              turn vague intention into a focused plan, then step straight into
              the practice workspace with a clear target.
            </p>

            <div className="mt-8 space-y-3">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoals(preset)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <span>{preset}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border-white/70 bg-white/88 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-950">
                  <Sparkles className="h-5 w-5 text-amber-700" />
                  Build Your Recommendation
                </CardTitle>
                <CardDescription className="text-base text-slate-600">
                  Give the assistant just enough context to shape the next session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="instrument" className="text-sm font-semibold text-slate-800">
                      Instrument
                    </Label>
                    <select
                      id="instrument"
                      value={instrument}
                      onChange={(e) => setInstrument(e.target.value)}
                      className={selectClassName}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select an instrument</option>
                      <option value="guitar">Guitar</option>
                      <option value="piano">Piano</option>
                      <option value="drums">Drums</option>
                      <option value="bass">Bass</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skillLevel" className="text-sm font-semibold text-slate-800">
                      Skill Level
                    </Label>
                    <select
                      id="skillLevel"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className={selectClassName}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Select your level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goals" className="text-sm font-semibold text-slate-800">
                      What do you want from this session?
                    </Label>
                    <Input
                      id="goals"
                      placeholder="e.g., get the bridge cleaner at 70 bpm, improve voicing changes..."
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-none"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Short and specific gets better recommendations.
                      </span>
                      <span className={goals.length > GOALS_MAX_CHARS ? "font-semibold text-red-600" : "text-slate-400"}>
                        {goals.length}/{GOALS_MAX_CHARS}
                      </span>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <p className="text-xs text-slate-500">
                    Identical requests are cached, and recommendation generation is rate-limited to control API spend.
                  </p>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Get Recommendation"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {recommendation && (
              <Card className="border-white/70 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_40%),linear-gradient(180deg,_#fff_0%,_#fff7ed_100%)] shadow-[0_25px_80px_-50px_rgba(15,23,42,0.35)]">
                <CardHeader>
                  <CardTitle className="text-xl text-slate-950">
                    Your Practice Recommendation
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {isCachedResult
                      ? "This matched a recent request, so we reused the saved recommendation."
                      : "Use this as the plan for your next focused session."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.5rem] border border-amber-200 bg-white/90 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {recommendation}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                  >
                    Take This Into Practice Session
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
