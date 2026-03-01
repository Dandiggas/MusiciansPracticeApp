"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function RecommendationsPage() {
  const router = useRouter();
  const [instrument, setInstrument] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [goals, setGoals] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
    setIsLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/recommendations/`,
        { instrument, skill_level: skillLevel, goals },
        { headers: { Authorization: `Token ${token}` } }
      );
      setRecommendation(response.data.recommendation);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to get recommendation. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectClassName =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Practice Recommendations
        </h1>
        <p className="text-muted-foreground mt-2">
          Get AI-powered practice suggestions tailored to your skill level and goals
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get a Recommendation</CardTitle>
          <CardDescription>
            Fill in your details and we&apos;ll generate a personalized practice plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instrument">Instrument</Label>
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
              <Label htmlFor="skillLevel">Skill Level</Label>
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
              <Label htmlFor="goals">Goals</Label>
              <Input
                id="goals"
                placeholder="e.g., improve finger picking, learn jazz chords..."
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Practice Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {recommendation}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
