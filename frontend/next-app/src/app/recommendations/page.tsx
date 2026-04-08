"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerGap, Sparkle, ArrowRight } from "@phosphor-icons/react";
import { saveStoredRecommendation } from "@/lib/practice-session-store";
import { MotionDiv } from "@/components/ui/motion-wrapper";
import { AnimatePresence } from "framer-motion";

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

  const selectClass =
    "flex h-10 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors duration-200 focus:border-primary/50 focus:bg-card";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-8 md:py-16">

        <MotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Page header — compact, tool-like */}
          <div className="flex items-center gap-2">
            <Sparkle size={18} weight="regular" className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Session Planner</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Shape your next session before you press play.
          </p>

          {/* Quick presets */}
          <div className="mt-6 flex flex-wrap gap-2">
            {GOAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setGoals(preset)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
                  goals === preset
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="instrument" className="text-xs font-medium text-muted-foreground">
                  Instrument
                </Label>
                <select
                  id="instrument"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className={selectClass}
                  required
                  disabled={isLoading}
                >
                  <option value="">Select</option>
                  <option value="guitar">Guitar</option>
                  <option value="piano">Piano</option>
                  <option value="drums">Drums</option>
                  <option value="bass">Bass</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="skillLevel" className="text-xs font-medium text-muted-foreground">
                  Level
                </Label>
                <select
                  id="skillLevel"
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value)}
                  className={selectClass}
                  required
                  disabled={isLoading}
                >
                  <option value="">Select</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goals" className="text-xs font-medium text-muted-foreground">
                What do you want from this session?
              </Label>
              <Input
                id="goals"
                placeholder="e.g., get the bridge cleaner at 70 bpm"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                required
                disabled={isLoading}
                className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-card"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Short and specific works best.</span>
                <span className={goals.length > GOALS_MAX_CHARS ? "font-medium text-destructive" : ""}>
                  {goals.length}/{GOALS_MAX_CHARS}
                </span>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/[0.06] px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                  <MotionDiv
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    <SpinnerGap size={16} weight="regular" className="mr-2 animate-spin" />
                    Generating...
                  </MotionDiv>
                ) : (
                  <MotionDiv
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center"
                  >
                    Get Recommendation
                    <ArrowRight size={14} weight="bold" className="ml-1.5" />
                  </MotionDiv>
                )}
              </AnimatePresence>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Identical requests are cached. Generation is rate-limited.
            </p>
          </form>

          {/* Result */}
          <AnimatePresence mode="wait">
            {recommendation && (
              <MotionDiv
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="mt-8"
              >
                <div className="rounded-xl border border-border/60 bg-card p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Your plan</p>
                    {isCachedResult && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        cached
                      </span>
                    )}
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-foreground/90">
                    {recommendation}
                  </div>
                  <Button
                    onClick={() => router.push("/practice-timer")}
                    className="mt-5 w-full"
                  >
                    Take This Into Practice
                    <ArrowRight size={14} weight="bold" className="ml-1.5" />
                  </Button>
                </div>
              </MotionDiv>
            )}
          </AnimatePresence>
        </MotionDiv>
      </div>
    </div>
  );
}
