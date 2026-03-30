"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
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
import {
  Play,
  Square,
  Clock,
  Pause,
  Youtube,
  Minus,
  Plus,
  Mic,
  MicOff,
  Music,
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import YouTubePlayer, {
  extractVideoId,
  YouTubePlayerHandle,
} from "@/components/youtube/YouTubePlayer";
import PlaybackSpeedControl from "@/components/youtube/PlaybackSpeedControl";
import ABLoopControl from "@/components/youtube/ABLoopControl";
import LocalAudioPlayer, {
  LocalAudioPlayerHandle,
} from "@/components/media/LocalAudioPlayer";
import TakeRecorder from "@/components/media/TakeRecorder";
import { MetronomeEngine } from "@/lib/audio/metronome-engine";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";
import {
  clearStoredPracticeSetup,
  clearStoredSessionSnapshot,
  getStoredPracticeSetup,
  saveStoredPracticeSetup,
  saveStoredSessionSnapshot,
  type StoredPracticeSetup,
} from "@/lib/practice-session-store";

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
];

type MediaSource = "youtube" | "audio";

interface RecentSession {
  session_id: number;
  instrument: string;
  description: string;
  session_date: string;
  youtube_url?: string;
}

export default function PracticeTimerPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [instrument, setInstrument] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mediaSource, setMediaSource] = useState<MediaSource>("youtube");
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [recentSession, setRecentSession] = useState<RecentSession | null>(null);
  const [storedSetup, setStoredSetup] = useState<StoredPracticeSetup | null>(null);
  const [restoredFromRecent, setRestoredFromRecent] = useState(false);

  const [bpm, setBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [, setTapTimes] = useState<number[]>([]);

  const [tunerActive, setTunerActive] = useState(false);
  const [tunerNote, setTunerNote] = useState<NoteInfo | null>(null);
  const [referenceFreq, setReferenceFreq] = useState(440);
  const [tunerError, setTunerError] = useState("");
  const [isTunerExpanded, setIsTunerExpanded] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null);
  const audioPlayerRef = useRef<LocalAudioPlayerHandle>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const tunerContextRef = useRef<AudioContext | null>(null);
  const tunerAnalyserRef = useRef<AnalyserNode | null>(null);
  const tunerStreamRef = useRef<MediaStream | null>(null);
  const tunerRafRef = useRef<number | null>(null);
  const attemptedResumeRef = useRef(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const videoId = extractVideoId(youtubeUrl);
  const hasVideo = Boolean(videoId);
  const activeMediaLabel = mediaSource === "youtube" ? "YouTube" : "MP3 Upload";
  const shouldAutoResume = searchParams.get("resume") === "1";

  const resetUploadedAudio = useCallback(() => {
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
    }
    setAudioObjectUrl(null);
    setAudioFileName(null);
  }, [audioObjectUrl]);

  const applyStoredSetup = useCallback((setup: StoredPracticeSetup) => {
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
    }
    setInstrument(setup.instrument || "");
    setDescription(setup.description || "");
    setYoutubeUrl(setup.youtubeUrl || "");
    setMediaSource(setup.mediaSource);
    setAudioObjectUrl(null);
    setAudioFileName(setup.audioFileName);
    setRestoredFromRecent(false);
  }, [audioObjectUrl]);

  const applyRecentSession = useCallback((session: RecentSession) => {
    setInstrument(session.instrument || "");
    setDescription(session.description || "");
    setYoutubeUrl(session.youtube_url || "");
    setMediaSource(session.youtube_url ? "youtube" : "audio");
    resetUploadedAudio();
    setRestoredFromRecent(true);
  }, [resetUploadedAudio]);

  const cleanupTools = useCallback(() => {
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    setMetronomeActive(false);
    setCurrentBeat(-1);

    if (tunerRafRef.current !== null) {
      cancelAnimationFrame(tunerRafRef.current);
      tunerRafRef.current = null;
    }
    if (tunerStreamRef.current) {
      tunerStreamRef.current.getTracks().forEach((track) => track.stop());
      tunerStreamRef.current = null;
    }
    if (tunerContextRef.current) {
      tunerContextRef.current.close();
      tunerContextRef.current = null;
    }
    tunerAnalyserRef.current = null;
    setTunerActive(false);
    setTunerNote(null);
  }, []);

  useEffect(() => {
    const checkActiveTimer = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const localSetup = getStoredPracticeSetup();
      if (localSetup) {
        setStoredSetup(localSetup);
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/timer/active/`, {
          headers: { Authorization: `Token ${token}` },
        });

        if (response.data.active) {
          const session = response.data.session;
          setSessionId(session.session_id);
          setInstrument(session.instrument);
          setDescription(session.description);
          setYoutubeUrl(session.youtube_url || "");
          setIsRunning(true);
          setIsPaused(session.is_paused || false);
          if (session.youtube_url) {
            setMediaSource("youtube");
          }
          saveStoredSessionSnapshot({
            status: session.is_paused ? "paused" : "active",
            sessionId: session.session_id,
            instrument: session.instrument || "",
            description: session.description || "",
            mediaSource: session.youtube_url ? "youtube" : "audio",
            youtubeUrl: session.youtube_url || "",
            audioFileName: localSetup?.audioFileName ?? null,
          });

          const startTime = new Date(session.started_at).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.floor((now - startTime) / 1000));
          return;
        }

        const recentResponse = await axios.get(`${apiBaseUrl}/`, {
          headers: { Authorization: `Token ${token}` },
        });

        if (!recentResponse || !Array.isArray(recentResponse.data)) {
          return;
        }

        const latestSession = [...recentResponse.data]
          .sort((a: RecentSession, b: RecentSession) => {
            const dateDiff =
              new Date(b.session_date).getTime() - new Date(a.session_date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (b.session_id || 0) - (a.session_id || 0);
          })[0];

        if (latestSession) {
          setRecentSession(latestSession);
          if (localSetup?.mediaSource === "audio") {
            applyStoredSetup(localSetup);
          } else {
            applyRecentSession(latestSession);
          }
        }
      } catch (requestError) {
        console.error("Error checking active timer", requestError);
      } finally {
        setInitialLoadComplete(true);
      }
    };

    void checkActiveTimer();
  }, [apiBaseUrl, applyRecentSession, applyStoredSetup, router]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
    return () => {
      cleanupTools();
    };
  }, [cleanupTools]);

  useEffect(() => {
    return () => {
      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl);
      }
    };
  }, [audioObjectUrl]);

  useEffect(() => {
    if (!instrument.trim() && !description.trim() && !youtubeUrl.trim() && !audioFileName) {
      clearStoredPracticeSetup();
      setStoredSetup(null);
      return;
    }

    saveStoredPracticeSetup({
      instrument: instrument.trim(),
      description: description.trim(),
      mediaSource,
      youtubeUrl: youtubeUrl.trim(),
      audioFileName,
      audioRequiresReupload: mediaSource === "audio" && Boolean(audioFileName),
    });
    setStoredSetup(getStoredPracticeSetup());
  }, [audioFileName, description, instrument, mediaSource, youtubeUrl]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const clearSetup = useCallback(() => {
    setInstrument("");
    setDescription("");
    setYoutubeUrl("");
    setMediaSource("youtube");
    resetUploadedAudio();
    setRestoredFromRecent(false);
    clearStoredPracticeSetup();
    setStoredSetup(null);
  }, [resetUploadedAudio]);

  const handleStart = useCallback(async () => {
    if (!instrument.trim()) {
      setError("Please enter an instrument");
      return;
    }

    setIsLoading(true);
    setError("");

    const token = localStorage.getItem("token");

    try {
      const response = await axios.post(
        `${apiBaseUrl}/timer/start/`,
        { instrument, description, youtube_url: youtubeUrl },
        { headers: { Authorization: `Token ${token}` } }
      );

      setSessionId(response.data.session_id);
      setIsRunning(true);
      setElapsedSeconds(0);
      saveStoredSessionSnapshot({
        status: "active",
        sessionId: response.data.session_id,
        instrument: instrument.trim(),
        description: description.trim(),
        mediaSource,
        youtubeUrl: youtubeUrl.trim(),
        audioFileName,
      });
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.error || "Failed to start timer");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    apiBaseUrl,
    audioFileName,
    description,
    instrument,
    mediaSource,
    youtubeUrl,
  ]);

  useEffect(() => {
    const needsAudioReupload =
      mediaSource === "audio" && Boolean(audioFileName) && !audioObjectUrl;

    if (
      !shouldAutoResume ||
      attemptedResumeRef.current ||
      !initialLoadComplete ||
      isRunning ||
      isLoading ||
      !instrument.trim() ||
      needsAudioReupload
    ) {
      return;
    }

    attemptedResumeRef.current = true;
    void handleStart();
  }, [
    audioFileName,
    audioObjectUrl,
    initialLoadComplete,
    instrument,
    isLoading,
    isRunning,
    mediaSource,
    shouldAutoResume,
    handleStart,
  ]);

  const handleStop = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/stop/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );

      const player = youtubePlayerRef.current?.getPlayer();
      if (player) {
        player.destroy();
      }

      cleanupTools();

      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      setInstrument("");
      setDescription("");
      setYoutubeUrl("");
      setMediaSource("youtube");
      resetUploadedAudio();
      setPlaybackSpeed(1);
      setElapsedSeconds(0);
      clearStoredSessionSnapshot();

      router.push("/profilepage");
    } catch {
      setError("Failed to stop timer");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/pause/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );

      setIsPaused(true);
      saveStoredSessionSnapshot({
        status: "paused",
        sessionId,
        instrument: instrument.trim(),
        description: description.trim(),
        mediaSource,
        youtubeUrl: youtubeUrl.trim(),
        audioFileName,
      });
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.error || "Failed to pause timer");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/resume/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );

      setIsPaused(false);
      saveStoredSessionSnapshot({
        status: "active",
        sessionId,
        instrument: instrument.trim(),
        description: description.trim(),
        mediaSource,
        youtubeUrl: youtubeUrl.trim(),
        audioFileName,
      });
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        setError(requestError.response?.data?.error || "Failed to resume timer");
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    const player = youtubePlayerRef.current?.getPlayer();
    if (player) {
      player.setPlaybackRate(speed);
    }
    audioPlayerRef.current?.setPlaybackRate(speed);
  }, []);

  const getLoopController = useCallback(() => {
    if (mediaSource === "youtube") {
      const player = youtubePlayerRef.current?.getPlayer();
      if (!player) return null;

      return {
        getCurrentTime: () => player.getCurrentTime(),
        seekTo: (seconds: number) => player.seekTo(seconds, true),
      };
    }

    if (!audioPlayerRef.current) {
      return null;
    }

    return {
      getCurrentTime: () => audioPlayerRef.current?.getCurrentTime() ?? 0,
      seekTo: (seconds: number) => audioPlayerRef.current?.seekTo(seconds),
    };
  }, [mediaSource]);

  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setAudioObjectUrl(nextUrl);
    setAudioFileName(file.name);
    setMediaSource("audio");
    setPlaybackSpeed(1);
  };

  const handleUpdateYoutubeUrl = async (newUrl: string) => {
    setYoutubeUrl(newUrl);
    setMediaSource("youtube");
    if (!sessionId) return;

    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${apiBaseUrl}/${sessionId}/`,
        { youtube_url: newUrl },
        { headers: { Authorization: `Token ${token}` } }
      );
    } catch {
      console.error("Failed to save YouTube URL");
    }
  };

  const handleBeatCallback = useCallback((beat: number) => {
    setCurrentBeat(beat);
  }, []);

  const handleMetronomeStart = useCallback(() => {
    const engine = new MetronomeEngine({
      bpm,
      beatsPerMeasure,
      onBeat: handleBeatCallback,
    });
    metronomeRef.current = engine;
    engine.start();
    setMetronomeActive(true);
  }, [bpm, beatsPerMeasure, handleBeatCallback]);

  const handleMetronomeStop = useCallback(() => {
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    setMetronomeActive(false);
    setCurrentBeat(-1);
  }, []);

  useEffect(() => {
    metronomeRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    metronomeRef.current?.setBeatsPerMeasure(beatsPerMeasure);
  }, [beatsPerMeasure]);

  useEffect(() => {
    metronomeRef.current?.setOnBeat(handleBeatCallback);
  }, [handleBeatCallback]);

  const handleBpmChange = (value: number) => {
    const clamped = Math.max(20, Math.min(300, value));
    setBpm(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    setTapTimes((prev) => {
      const recent = [...prev, now].filter((time) => now - time < 3000);
      if (recent.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recent.length; i += 1) {
          intervals.push(recent[i] - recent[i - 1]);
        }
        const avgInterval =
          intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
        const tappedBpm = Math.round(60000 / avgInterval);
        handleBpmChange(tappedBpm);
      }
      return recent;
    });
  };

  const analyzePitch = useCallback(() => {
    if (!tunerAnalyserRef.current || !tunerContextRef.current) return;

    const analyser = tunerAnalyserRef.current;
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const frequency = detectPitch(buffer, tunerContextRef.current.sampleRate);

    if (frequency !== null) {
      setTunerNote(frequencyToNote(frequency, referenceFreq));
    }

    tunerRafRef.current = requestAnimationFrame(analyzePitch);
  }, [referenceFreq]);

  const startTuner = useCallback(async () => {
    setTunerError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      tunerStreamRef.current = stream;

      const audioContext = new AudioContext();
      tunerContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      tunerAnalyserRef.current = analyser;

      setTunerActive(true);
      tunerRafRef.current = requestAnimationFrame(analyzePitch);
    } catch {
      setTunerError(
        "Could not access microphone. Please allow microphone permissions."
      );
    }
  }, [analyzePitch]);

  const stopTuner = useCallback(() => {
    if (tunerRafRef.current !== null) {
      cancelAnimationFrame(tunerRafRef.current);
      tunerRafRef.current = null;
    }
    if (tunerStreamRef.current) {
      tunerStreamRef.current.getTracks().forEach((track) => track.stop());
      tunerStreamRef.current = null;
    }
    if (tunerContextRef.current) {
      tunerContextRef.current.close();
      tunerContextRef.current = null;
    }
    tunerAnalyserRef.current = null;
    setTunerActive(false);
    setTunerNote(null);
  }, []);

  const gaugePercent = tunerNote
    ? Math.max(0, Math.min(100, ((tunerNote.cents + 50) / 100) * 100))
    : 50;
  const isInTune = tunerNote !== null && Math.abs(tunerNote.cents) <= 5;
  const isClose = tunerNote !== null && Math.abs(tunerNote.cents) <= 15;

  useEffect(() => {
    if (tunerActive) {
      setIsTunerExpanded(true);
    }
  }, [tunerActive]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(14,165,233,0.15),_transparent_22%),linear-gradient(180deg,_#fffdf7_0%,_#fff_38%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-28 h-64 w-64 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-8 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-rose-100/30 blur-3xl" />
      </div>

      <div className="container relative mx-auto p-4 md:p-8">
        <div className="mx-auto mb-8 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 shadow-sm backdrop-blur">
            Music Workstation
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
            Practice Session
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 md:text-lg">
            Keep the song front and center. Loop difficult bars, slow them down,
            and keep your timer, tuner, and metronome within reach.
          </p>
        </div>

        <div
          className={cn(
            "mx-auto",
            isRunning ? "max-w-7xl space-y-6" : "max-w-6xl space-y-6"
          )}
        >
          {!isRunning && (
            <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="min-w-0 border-white/60 bg-slate-950 text-white shadow-[0_35px_90px_-45px_rgba(15,23,42,0.9)]">
                <CardHeader className="space-y-5">
                  <div className="inline-flex w-fit items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-200">
                    Session Setup
                  </div>
                  <div className="space-y-3">
                    <CardTitle className="text-3xl font-black tracking-tight text-white md:text-4xl">
                      Start with the track you are actually working on.
                    </CardTitle>
                    <CardDescription className="max-w-xl text-base leading-7 text-slate-300">
                      Pick a YouTube lesson or upload an MP3, then build the rest
                      of the session around that source. The practice tools stay
                      close, but the music stays primary.
                    </CardDescription>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Primary
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        Media-first layout
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Keep the song at the top instead of hiding it behind tools.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Practice
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        Loop and slowdown
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Repeat hard phrases and reduce tempo without leaving the session.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Support
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        Timer, tuner, pulse
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Keep the session structured while your hands stay on the instrument.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-white/10 via-white/6 to-transparent p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-300">
                          Session Clock
                        </p>
                        <div className="mt-3 text-5xl font-black tracking-[0.12em] text-white sm:text-6xl md:text-7xl">
                          {formatTime(elapsedSeconds)}
                        </div>
                      </div>
                      <div className="w-full rounded-2xl border border-white/12 bg-black/20 px-4 py-3 text-left lg:w-auto lg:text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          State
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-100">
                          Ready to start
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="min-w-0 border-white/70 bg-white/88 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Clock className="h-5 w-5" />
                    <CardTitle className="text-2xl font-bold">
                      Start New Session
                    </CardTitle>
                  </div>
                  <CardDescription className="text-base text-slate-600">
                    Instrument, context, and your preferred practice source.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {storedSetup?.mediaSource === "audio" && storedSetup.audioFileName && (
                    <div className="rounded-3xl border border-sky-200 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.18),_transparent_40%),linear-gradient(180deg,_#f8fdff_0%,_#eef8ff_100%)] p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                            Last Media Source
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {storedSetup.audioFileName}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              Your last setup used a local MP3. Re-upload this track to keep the same loop and slowdown workflow.
                            </p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
                          File contents can&apos;t be restored from the browser alone.
                        </div>
                      </div>
                    </div>
                  )}

                  {recentSession && (
                    <div className="rounded-3xl border border-amber-200 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_42%),linear-gradient(180deg,_#fffdf6_0%,_#fff7ed_100%)] p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
                            Last Setup Ready
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {recentSession.instrument}
                              {recentSession.description ? ` · ${recentSession.description}` : ""}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              From {recentSession.session_date}
                              {recentSession.youtube_url ? " · YouTube source restored" : " · Add media or start immediately"}
                            </p>
                          </div>
                          {restoredFromRecent && (
                            <p className="text-xs font-medium text-emerald-700">
                              Your last setup has been loaded so you can jump straight back in.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => applyRecentSession(recentSession)}
                            className="rounded-2xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                          >
                            Use Last Setup
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={clearSetup}
                            className="rounded-2xl text-slate-600 hover:bg-white/70 hover:text-slate-900"
                          >
                            Start Fresh
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="instrument"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Instrument *
                      </Label>
                      <Input
                        id="instrument"
                        type="text"
                        value={instrument}
                        onChange={(e) => setInstrument(e.target.value)}
                        placeholder="e.g., Guitar, Piano, Drums"
                        required
                        className="h-12 rounded-2xl border-slate-200 bg-white/80 px-4 shadow-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="description"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Description
                      </Label>
                      <Input
                        id="description"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Verse clean-up, scales, full-song rehearsal"
                        className="h-12 rounded-2xl border-slate-200 bg-white/80 px-4 shadow-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Practice Source
                    </p>
                    <div className="mt-4 grid gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="youtube-url"
                          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
                        >
                          <Youtube className="h-4 w-4" />
                          YouTube Video
                        </Label>
                        <Input
                          id="youtube-url"
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-none"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <span className="h-px flex-1 bg-slate-200" />
                        or
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="audio-upload"
                          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
                        >
                          <Upload className="h-4 w-4" />
                          MP3 Upload
                        </Label>
                        <Input
                          id="audio-upload"
                          type="file"
                          accept="audio/mpeg,audio/mp3"
                          onChange={handleAudioFileChange}
                          className="h-12 rounded-2xl border-dashed border-slate-300 bg-white px-4 shadow-none"
                        />
                        <p className="text-xs text-slate-500">
                          {audioFileName
                            ? `Selected: ${audioFileName}`
                            : "Upload a local track when you want the same looping flow without YouTube."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                    The goal is simple: sit down, hit start, and keep moving.
                  </p>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleStart}
                    disabled={isLoading}
                    className="h-13 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg shadow-slate-950/20 hover:bg-slate-800"
                    size="lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {isLoading ? "Starting..." : "Start Practice"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {isRunning && (
            <>
              <Card className="overflow-hidden border-white/60 bg-white/85 shadow-[0_30px_100px_-55px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.9)_46%,rgba(120,53,15,0.88))] px-6 py-6 text-white md:px-8">
                  <div className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                    Main Workspace
                  </div>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <h2 className="flex items-center gap-2 text-3xl font-black tracking-tight">
                        {mediaSource === "youtube" ? (
                          <Youtube className="h-5 w-5" />
                        ) : (
                          <Music className="h-5 w-5" />
                        )}
                        Practice Media
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-300 md:text-base">
                        Make the song the center of the room. Use the controls
                        below to switch sources, reduce tempo, and loop problem
                        sections without losing momentum.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-left">
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Instrument
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {instrument}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Source
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {activeMediaLabel}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Timer
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold text-white">
                          {formatTime(elapsedSeconds)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="space-y-6 px-6 py-6 md:px-8">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button
                        type="button"
                        variant={mediaSource === "youtube" ? "default" : "outline"}
                        className={cn(
                          "h-12 rounded-2xl md:flex-1",
                          mediaSource === "youtube"
                            ? "bg-slate-950 text-white hover:bg-slate-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                        onClick={() => setMediaSource("youtube")}
                      >
                        <Youtube className="mr-2 h-4 w-4" />
                        Use YouTube
                      </Button>
                      <Button
                        type="button"
                        variant={mediaSource === "audio" ? "default" : "outline"}
                        className={cn(
                          "h-12 rounded-2xl md:flex-1",
                          mediaSource === "audio"
                            ? "bg-slate-950 text-white hover:bg-slate-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                        onClick={() => setMediaSource("audio")}
                      >
                        <Music className="mr-2 h-4 w-4" />
                        Use MP3
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="youtube-url-grid"
                          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
                        >
                          <Youtube className="h-4 w-4" />
                          YouTube URL
                        </Label>
                        <Input
                          id="youtube-url-grid"
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => {
                            void handleUpdateYoutubeUrl(e.target.value);
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="h-12 rounded-2xl border-slate-200 bg-white px-4 shadow-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="audio-upload-grid"
                          className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"
                        >
                          <Upload className="h-4 w-4" />
                          Upload MP3
                        </Label>
                        <Input
                          id="audio-upload-grid"
                          type="file"
                          accept="audio/mpeg,audio/mp3"
                          onChange={handleAudioFileChange}
                          className="h-12 rounded-2xl border-dashed border-slate-300 bg-white px-4 shadow-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.28fr_0.88fr] xl:items-start">
                    <div className="space-y-4">
                      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-inner shadow-slate-200/50 md:p-5">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                              Active Source
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {audioFileName
                                ? `Loaded track: ${audioFileName}`
                                : mediaSource === "youtube"
                                  ? "Paste a YouTube lesson, performance, or play-along."
                                  : "Upload a local MP3 and practice with the same controls."}
                            </p>
                          </div>
                          <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                            {activeMediaLabel}
                          </div>
                        </div>

                        {mediaSource === "youtube" ? (
                          hasVideo ? (
                            <YouTubePlayer
                              ref={youtubePlayerRef}
                              videoId={videoId!}
                              onReady={(player) => {
                                if (playbackSpeed !== 1) {
                                  player.setPlaybackRate(playbackSpeed);
                                }
                              }}
                            />
                          ) : (
                            <div className="flex aspect-video items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_35%),linear-gradient(180deg,_#fff_0%,_#f8fafc_100%)] text-center">
                              <div className="space-y-4 px-6">
                                <div className="mx-auto w-fit rounded-full bg-amber-100 p-4 text-amber-700">
                                  <Youtube className="h-8 w-8" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    Paste a YouTube URL to load your practice video
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Great for lessons, play-alongs, and performance videos.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <LocalAudioPlayer
                            ref={audioPlayerRef}
                            audioUrl={audioObjectUrl}
                            fileName={audioFileName}
                            playbackSpeed={playbackSpeed}
                          />
                        )}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                          <PlaybackSpeedControl
                            currentSpeed={playbackSpeed}
                            onSpeedChange={handleSpeedChange}
                          />
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                          <p className="text-sm font-semibold text-slate-900">
                            A-B Loop
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Mark the phrase you want to isolate and repeat.
                          </p>
                          <div className="mt-3">
                            <ABLoopControl getController={getLoopController} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-4 shadow-inner shadow-slate-200/50 md:p-5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Review Take
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Record yourself beside the source so listening back feels like part of the same loop.
                          </p>
                        </div>
                        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                          Recorder
                        </div>
                      </div>
                      <TakeRecorder />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <Card className="border-white/70 bg-white/86 shadow-[0_20px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                      <Clock className="h-5 w-5" />
                      Session Timer
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Keep the clock visible while your practice media stays center stage.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[1.75rem] bg-slate-950 px-4 py-6 text-center text-white shadow-lg shadow-slate-950/10">
                      <div className="text-5xl font-black font-mono tracking-[0.14em]">
                        {formatTime(elapsedSeconds)}
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {isPaused ? "⏸ Paused" : "Time elapsed"}
                      </p>
                    </div>

                    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Current Session
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                          {activeMediaLabel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        <strong className="text-slate-900">Instrument:</strong>{" "}
                        {instrument}
                      </p>
                      {description && (
                        <p className="text-sm text-slate-700">
                          <strong className="text-slate-900">Description:</strong>{" "}
                          {description}
                        </p>
                      )}
                      {mediaSource === "audio" && audioFileName && (
                        <p className="text-sm text-slate-700">
                          <strong className="text-slate-900">Track:</strong>{" "}
                          {audioFileName}
                        </p>
                      )}
                    </div>

                    {error && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {isPaused ? (
                        <Button
                          onClick={handleResume}
                          disabled={isLoading}
                          className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          {isLoading ? "Resuming..." : "Resume"}
                        </Button>
                      ) : (
                        <Button
                          onClick={handlePause}
                          disabled={isLoading}
                          variant="secondary"
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-100 text-slate-800 shadow-none hover:bg-slate-200"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          {isLoading ? "Pausing..." : "Pause"}
                        </Button>
                      )}
                      <Button
                        onClick={handleStop}
                        disabled={isLoading}
                        variant="destructive"
                        className="h-11 w-full rounded-2xl"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        {isLoading ? "Stopping..." : "Stop & Save"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/70 bg-white/86 shadow-[0_20px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">
                      Metronome
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Keep time while you practice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[1.75rem] border border-amber-200 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.16),_transparent_46%),linear-gradient(180deg,_#fff_0%,_#fff7ed_100%)] p-5 text-center">
                      <div className="text-5xl font-black font-mono text-slate-950">
                        {bpm}
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                        BPM
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleBpmChange(bpm - 1)}
                        className="rounded-2xl border-slate-200 bg-white"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <input
                        type="range"
                        min={20}
                        max={300}
                        value={bpm}
                        onChange={(e) => handleBpmChange(Number(e.target.value))}
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-600"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleBpmChange(bpm + 1)}
                        className="rounded-2xl border-slate-200 bg-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={20}
                        max={300}
                        value={bpm}
                        onChange={(e) => handleBpmChange(Number(e.target.value))}
                        className="h-11 w-20 rounded-2xl border-slate-200 bg-white text-center shadow-none"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleTapTempo}
                        className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-100 text-slate-800 shadow-none hover:bg-slate-200"
                      >
                        Tap Tempo
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Time Signature
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {TIME_SIGNATURES.map((ts) => (
                          <Button
                            key={ts.label}
                            variant={
                              beatsPerMeasure === ts.beats ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setBeatsPerMeasure(ts.beats)}
                            className={cn(
                              "rounded-full px-3 text-xs",
                              beatsPerMeasure === ts.beats
                                ? "bg-slate-950 text-white hover:bg-slate-800"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            {ts.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 py-2">
                      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-5 w-5 rounded-full border-2 transition-all duration-100",
                            currentBeat === i
                              ? i === 0
                                ? "scale-110 border-amber-600 bg-amber-500"
                                : "border-slate-950 bg-slate-900"
                              : "border-slate-300 bg-white"
                          )}
                        />
                      ))}
                    </div>

                    <Button
                      onClick={
                        metronomeActive
                          ? handleMetronomeStop
                          : handleMetronomeStart
                      }
                      className={cn(
                        "h-11 w-full rounded-2xl",
                        metronomeActive
                          ? ""
                          : "bg-slate-950 text-white hover:bg-slate-800"
                      )}
                      variant={metronomeActive ? "destructive" : "default"}
                    >
                      {metronomeActive ? (
                        <>
                          <Square className="mr-2 h-4 w-4" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" /> Start
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-white/70 bg-white/86 shadow-[0_20px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg text-slate-900">
                          Tuner
                        </CardTitle>
                        <CardDescription className="text-slate-600">
                          Tune up, then tuck this away for the rest of the session.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTunerExpanded((prev) => !prev)}
                        className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        {isTunerExpanded ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Open
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Status
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {tunerActive
                              ? tunerNote
                                ? `${tunerNote.name}${tunerNote.octave} · ${tunerNote.cents > 0 ? "+" : ""}${tunerNote.cents} cents`
                                : "Listening for a note"
                              : "Tuner tucked away"}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 shadow-sm">
                          {tunerActive ? "On" : "Off"}
                        </span>
                      </div>
                    </div>

                    {isTunerExpanded && (
                      <>
                        <div className="rounded-[1.75rem] border border-emerald-200 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_42%),linear-gradient(180deg,_#fff_0%,_#ecfdf5_100%)] px-4 py-5 text-center">
                          <div
                            className={cn(
                              "text-6xl font-black font-mono transition-colors",
                              !tunerNote && "text-slate-300",
                              tunerNote && isInTune && "text-green-600",
                              tunerNote && !isInTune && isClose && "text-amber-500",
                              tunerNote && !isInTune && !isClose && "text-red-500"
                            )}
                          >
                            {tunerNote ? `${tunerNote.name}${tunerNote.octave}` : "--"}
                          </div>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {tunerNote
                              ? `${tunerNote.frequency.toFixed(1)} Hz`
                              : tunerActive
                                ? "Listening"
                                : "Idle"}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <span>Flat</span>
                            <span>In Tune</span>
                            <span>Sharp</span>
                          </div>
                          <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
                            <div className="absolute left-1/2 top-0 bottom-0 z-10 w-0.5 bg-green-500" />
                            <div
                              className={cn(
                                "absolute top-0 bottom-0 w-2 -translate-x-1/2 rounded-full transition-all duration-100",
                                isInTune
                                  ? "bg-green-500"
                                  : isClose
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              )}
                              style={{ left: `${gaugePercent}%` }}
                            />
                          </div>
                          <div className="text-center text-sm font-mono font-semibold text-slate-700">
                            {tunerNote
                              ? `${tunerNote.cents > 0 ? "+" : ""}${tunerNote.cents} cents`
                              : "-- cents"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <Label
                            htmlFor="ref-freq-grid"
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                          >
                            A4 =
                          </Label>
                          <Input
                            id="ref-freq-grid"
                            type="number"
                            min={420}
                            max={460}
                            value={referenceFreq}
                            onChange={(e) => setReferenceFreq(Number(e.target.value))}
                            className="h-10 w-20 rounded-xl border-slate-200 bg-white text-center shadow-none"
                          />
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Hz
                          </span>
                        </div>
                      </>
                    )}

                    {tunerError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {tunerError}
                      </div>
                    )}

                    <Button
                      onClick={tunerActive ? stopTuner : startTuner}
                      className={cn(
                        "h-11 w-full rounded-2xl",
                        tunerActive
                          ? ""
                          : "bg-slate-950 text-white hover:bg-slate-800"
                      )}
                      variant={tunerActive ? "destructive" : "default"}
                    >
                      {tunerActive ? (
                        <>
                          <MicOff className="mr-2 h-4 w-4" /> Stop Tuner
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-4 w-4" /> Start Tuner
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

              </div>
            </>
          )}

          {!isRunning && (
            <Card className="border-white/70 bg-white/86 shadow-[0_20px_80px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-900">
                  Practice Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Media
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Pick the source you will actually rehearse with.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Tempo
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Slow hard passages down before you raise the speed again.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Looping
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Use A-B loop for short problem bars instead of replaying the full song.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Focus
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Write down your objective so the session stays intentional.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
