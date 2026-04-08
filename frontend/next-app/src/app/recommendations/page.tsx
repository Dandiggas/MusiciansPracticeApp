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
import { SpinnerGap, Sparkle, ArrowRight } from "@phosphor-icons/react";
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
    "flex h-12 w-full rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="min-h-screen bg-background">
      <div className="container relative mx-auto max-w-6xl p-4 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="rounded-xl border border-border bg-card p-8 text-card-foreground">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Session Planning
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-foreground md:text-5xl">
              Decide what matters before you press play.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
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
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 text-left text-sm text-foreground transition hover:bg-secondary/80"
                >
                  <span>{preset}</span>
                  <ArrowRight size={20} weight="regular" className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="rounded-xl border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-card-foreground">
                  <Sparkle size={20} weight="regular" className="text-primary" />
                  Build Your Recommendation
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Give the assistant just enough context to shape the next session.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="instrument" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
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
                    <Label htmlFor="skillLevel" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
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
                    <Label htmlFor="goals" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      What do you want from this session?
                    </Label>
                    <Input
                      id="goals"
                      placeholder="e.g., get the bridge cleaner at 70 bpm, improve voicing changes..."
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-12 rounded-lg border-border bg-secondary px-4"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Short and specific gets better recommendations.
                      </span>
                      <span className={goals.length > GOALS_MAX_CHARS ? "font-semibold text-destructive" : "text-muted-foreground"}>
                        {goals.length}/{GOALS_MAX_CHARS}
                      </span>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <p className="text-xs text-muted-foreground">
                    Identical requests are cached, and recommendation generation is rate-limited to control API spend.
                  </p>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <>
                        <SpinnerGap size={20} weight="regular" className="mr-2 animate-spin" />
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
              <Card className="rounded-xl border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-xl text-card-foreground">
                    Your Practice Recommendation
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {isCachedResult
                      ? "This matched a recent request, so we reused the saved recommendation."
                      : "Use this as the plan for your next focused session."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {recommendation}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    className="h-11 w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
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
