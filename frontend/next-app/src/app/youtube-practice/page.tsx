"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Youtube, Save, Clock, Library } from "lucide-react";
import YouTubePlayer, {
  extractVideoId,
  YouTubePlayerHandle,
} from "@/components/youtube/YouTubePlayer";
import ABLoopControl from "@/components/youtube/ABLoopControl";

const SPEEDS = [0.5, 0.75, 1, 1.25];

interface SessionData {
  session_id: number;
  instrument: string;
  description: string;
  youtube_url: string;
  session_date: string;
  duration: string;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function YouTubePracticePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);

  // Save form state
  const [instrument, setInstrument] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Library state
  const [librarySessions, setLibrarySessions] = useState<SessionData[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null);
  const timestampIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const videoId = extractVideoId(youtubeUrl);
  const hasVideo = Boolean(videoId);

  // Fetch library of past sessions with YouTube URLs
  useEffect(() => {
    const fetchLibrary = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/sessions/`, {
          headers: { Authorization: `Token ${token}` },
        });
        const sessionsWithVideo = response.data.filter(
          (s: SessionData) => s.youtube_url && s.youtube_url.trim() !== ""
        );
        setLibrarySessions(sessionsWithVideo);
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setIsLoadingLibrary(false);
      }
    };

    fetchLibrary();
  }, [apiBaseUrl, router]);

  // Update current timestamp while playing
  useEffect(() => {
    if (playerReady) {
      timestampIntervalRef.current = setInterval(() => {
        const player = youtubePlayerRef.current?.getPlayer();
        if (player) {
          setCurrentTime(player.getCurrentTime());
          setVideoDuration(player.getDuration());
        }
      }, 500);
    }

    return () => {
      if (timestampIntervalRef.current) {
        clearInterval(timestampIntervalRef.current);
        timestampIntervalRef.current = null;
      }
    };
  }, [playerReady]);

  const handlePlayerReady = useCallback(
    (player: YT.Player) => {
      setPlayerReady(true);
      if (playbackSpeed !== 1) {
        player.setPlaybackRate(playbackSpeed);
      }
    },
    [playbackSpeed]
  );

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    const player = youtubePlayerRef.current?.getPlayer();
    if (player) {
      player.setPlaybackRate(speed);
    }
  }, []);

  const getPlayer = useCallback(() => {
    return youtubePlayerRef.current?.getPlayer() ?? null;
  }, []);

  const handleLoadFromLibrary = (session: SessionData) => {
    setYoutubeUrl(session.youtube_url);
    setPlayerReady(false);
    setCurrentTime(0);
    setVideoDuration(0);
    setPlaybackSpeed(1);
  };

  const handleSaveSession = async () => {
    if (!instrument.trim()) {
      setSaveError("Instrument is required");
      return;
    }
    if (!duration.trim()) {
      setSaveError("Duration is required");
      return;
    }

    // Validate duration format HH:MM:SS
    const durationMatch = duration.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!durationMatch) {
      setSaveError("Duration must be in HH:MM:SS format");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await axios.post(
        `${apiBaseUrl}/sessions/`,
        {
          instrument,
          description,
          duration,
          session_date: new Date().toISOString().split("T")[0],
          youtube_url: youtubeUrl,
        },
        { headers: { Authorization: `Token ${token}` } }
      );

      setSaveSuccess(true);
      setInstrument("");
      setDescription("");
      setDuration("");

      // Add to library if it has a URL
      if (youtubeUrl) {
        setLibrarySessions((prev) => [response.data, ...prev]);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === "object" && data !== null) {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${val}`)
            .join(", ");
          setSaveError(messages || "Failed to save session");
        } else {
          setSaveError("Failed to save session");
        }
      } else {
        setSaveError("An unexpected error occurred");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          YouTube Practice
        </h1>
        <p className="text-muted-foreground mt-2">
          Practice along with videos from your library
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* URL Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              Video Player
            </CardTitle>
            <CardDescription>
              Paste a YouTube URL or select from your library below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube URL</Label>
              <Input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value);
                  setPlayerReady(false);
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            {/* Player */}
            {hasVideo && (
              <div className="space-y-4">
                <YouTubePlayer
                  ref={youtubePlayerRef}
                  videoId={videoId!}
                  onReady={handlePlayerReady}
                />

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">
                    {formatTimestamp(currentTime)} /{" "}
                    {formatTimestamp(videoDuration)}
                  </span>
                </div>

                {/* Playback Speed */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Playback Speed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPEEDS.map((speed) => (
                      <Button
                        key={speed}
                        variant={
                          playbackSpeed === speed ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handleSpeedChange(speed)}
                        className="min-w-[3.5rem] text-xs"
                      >
                        {speed === 1 ? "1x" : `${speed}x`}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* A-B Loop */}
                <ABLoopControl getPlayer={getPlayer} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save to Session */}
        {hasVideo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Save className="h-5 w-5" />
                Save to Session
              </CardTitle>
              <CardDescription>
                Log this practice session to your history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instrument">Instrument *</Label>
                  <Input
                    id="instrument"
                    type="text"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    placeholder="e.g., Guitar, Piano"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (HH:MM:SS) *</Label>
                  <Input
                    id="duration"
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 00:30:00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Working on chord progressions"
                />
              </div>

              {saveError && (
                <p className="text-sm font-medium text-destructive">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-sm font-medium text-green-600">
                  Session saved successfully!
                </p>
              )}

              <Button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Session"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Video Library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Library className="h-5 w-5" />
              Your Practice Videos
            </CardTitle>
            <CardDescription>
              Sessions with YouTube videos from your practice history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLibrary ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Loading your videos...
              </p>
            ) : librarySessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No practice sessions with videos yet. Paste a URL above to get
                started!
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {librarySessions.map((session) => {
                  const sessionVideoId = extractVideoId(session.youtube_url);
                  const isActive =
                    sessionVideoId && sessionVideoId === videoId;
                  return (
                    <button
                      key={session.session_id}
                      onClick={() => handleLoadFromLibrary(session)}
                      className={`group text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                        isActive
                          ? "border-primary bg-accent"
                          : "border-border"
                      }`}
                    >
                      {sessionVideoId && (
                        <div className="aspect-video w-full rounded-md overflow-hidden mb-2 bg-muted">
                          <img
                            src={`https://img.youtube.com/vi/${sessionVideoId}/mqdefault.jpg`}
                            alt={session.instrument}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-sm font-medium truncate">
                        {session.instrument}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {session.session_date}
                        </Badge>
                        {session.duration && (
                          <span className="text-xs text-muted-foreground">
                            {session.duration}
                          </span>
                        )}
                      </div>
                      {session.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {session.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
