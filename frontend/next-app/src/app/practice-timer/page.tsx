"use client";

import React, { Suspense, useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Play, Square, Pause } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type YouTubePlayerHandle } from "@/components/youtube/YouTubePlayer";
import { type LocalAudioPlayerHandle } from "@/components/media/LocalAudioPlayer";
import TakeRecorder from "@/components/media/TakeRecorder";
import SessionSetupForm from "@/components/studio/SessionSetupForm";
import PracticeMedia from "@/components/studio/PracticeMedia";
import MetronomeWidget from "@/components/studio/MetronomeWidget";
import SheetMusicWidget from "@/components/studio/SheetMusicWidget";
import SheetMusicPicker from "@/components/studio/SheetMusicPicker";
import { getSheetMusic } from "@/lib/sheet-music-api";
import TunerWidget from "@/components/studio/TunerWidget";
import SessionPerformance from "@/components/studio/SessionPerformance";
import FocusPoints from "@/components/studio/FocusPoints";
import { MetronomeEngine } from "@/lib/audio/metronome-engine";
import { detectPitch } from "@/lib/audio/pitch-detector";
import { frequencyToNote, type NoteInfo } from "@/lib/audio/note-utils";
import {
  clearStoredPracticeSetup,
  clearStoredSessionSnapshot,
  getStoredPracticeSetup,
  saveStoredPracticeSetup,
  saveStoredSessionSnapshot,
  getProject,
  saveProject,
  INSTRUMENTS,
  type InstrumentName,
  type StoredPracticeSetup,
} from "@/lib/practice-session-store";

type MediaSource = "youtube" | "audio";

interface RecentSession {
  session_id: number;
  instrument: string;
  description: string;
  session_date: string;
  youtube_url?: string;
}

export default function PracticeTimerPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>}>
      <PracticeTimerContent />
    </Suspense>
  );
}

function PracticeTimerContent() {
  // ─── Core session state ──────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [instrument, setInstrument] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
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

  // ─── Sheet music state ──────────────────────────────────────────────
  const [sheetMusicId, setSheetMusicId] = useState<number | null>(null);
  const [sheetMusicTitle, setSheetMusicTitle] = useState<string | null>(null);
  const [sheetMusicPageCount, setSheetMusicPageCount] = useState(0);
  const [sheetMusicInitialPage, setSheetMusicInitialPage] = useState(1);
  const [showSheetMusicPicker, setShowSheetMusicPicker] = useState(false);

  // ─── Metronome state ─────────────────────────────────────────────────
  const [bpm, setBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [, setTapTimes] = useState<number[]>([]);

  // ─── Tuner state ─────────────────────────────────────────────────────
  const [tunerActive, setTunerActive] = useState(false);
  const [tunerNote, setTunerNote] = useState<NoteInfo | null>(null);
  const [referenceFreq] = useState(440);
  const [tunerError, setTunerError] = useState("");

  // ─── Refs ────────────────────────────────────────────────────────────
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

  const shouldAutoResume = searchParams.get("resume") === "1";
  const instrumentParam = searchParams.get("instrument") as InstrumentName | null;

  // ─── Helpers ─────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

  const applyStoredSetupRef = useRef(applyStoredSetup);
  applyStoredSetupRef.current = applyStoredSetup;
  const applyRecentSessionRef = useRef(applyRecentSession);
  applyRecentSessionRef.current = applyRecentSession;

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

  const clearSetup = useCallback(() => {
    setInstrument("");
    setSongTitle("");
    setDescription("");
    setNotes("");
    setYoutubeUrl("");
    setMediaSource("youtube");
    resetUploadedAudio();
    setRestoredFromRecent(false);
    clearStoredPracticeSetup();
    setStoredSetup(null);
  }, [resetUploadedAudio]);

  // ─── Mount: check active timer, load instrument project ──────────────
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

        // Priority: instrument param from Launch Pad > recent session > stored setup
        if (instrumentParam && INSTRUMENTS.includes(instrumentParam)) {
          const project = getProject(instrumentParam);
          if (project) {
            setInstrument(project.instrument);
            setSongTitle(project.songTitle || "");
            setDescription(project.description || "");
            setNotes(project.notes || "");
            setYoutubeUrl(project.youtubeUrl || "");
            setBpm(project.bpm || 120);
            setMediaSource(project.mediaSource || "youtube");
            setAudioFileName(project.audioFileName);
            if (project.sheetMusicId) {
              setSheetMusicId(project.sheetMusicId);
              setSheetMusicTitle(project.sheetMusicTitle);
              getSheetMusic(project.sheetMusicId)
                .then((sm) => {
                  setSheetMusicPageCount(sm.page_count);
                  setSheetMusicInitialPage(sm.last_page_viewed);
                })
                .catch(() => {
                  setSheetMusicId(null);
                  setSheetMusicTitle(null);
                });
            } else {
              setSheetMusicId(null);
              setSheetMusicTitle(null);
            }
          } else {
            setInstrument(instrumentParam);
          }
        } else {
          const recentResponse = await axios.get(`${apiBaseUrl}/`, {
            headers: { Authorization: `Token ${token}` },
          });

          if (recentResponse && Array.isArray(recentResponse.data)) {
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
                applyStoredSetupRef.current(localSetup);
              } else {
                applyRecentSessionRef.current(latestSession);
              }
            }
          }
        }
      } catch (requestError) {
        console.error("Error checking active timer", requestError);
      } finally {
        setInitialLoadComplete(true);
      }
    };

    void checkActiveTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, router]);

  // ─── Timer interval ──────────────────────────────────────────────────
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

  // ─── Cleanup on unmount ──────────────────────────────────────────────
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

  // ─── Persist setup to localStorage ───────────────────────────────────
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

  // ─── Session handlers ────────────────────────────────────────────────
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

      if (INSTRUMENTS.includes(instrument as InstrumentName)) {
        saveProject({
          instrument: instrument as InstrumentName,
          songTitle,
          description,
          youtubeUrl,
          bpm,
          notes,
          mediaSource,
          audioFileName,
          sheetMusicId: sheetMusicId,
          sheetMusicTitle: sheetMusicTitle,
          lastPracticedAt: new Date().toISOString(),
        });
      }
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
    bpm,
    description,
    instrument,
    mediaSource,
    notes,
    sheetMusicId,
    sheetMusicTitle,
    songTitle,
    youtubeUrl,
  ]);

  // ─── Auto-resume from URL param ─────────────────────────────────────
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

    // Snapshot current values before clearing state
    const currentInstrument = instrument;
    const currentSongTitle = songTitle;
    const currentDescription = description;
    const currentNotes = notes;
    const currentYoutubeUrl = youtubeUrl;
    const currentBpm = bpm;
    const currentMediaSource = mediaSource;
    const currentAudioFileName = audioFileName;
    const currentSheetMusicId = sheetMusicId;
    const currentSheetMusicTitle = sheetMusicTitle;

    setIsLoading(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/stop/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );

      if (INSTRUMENTS.includes(currentInstrument as InstrumentName)) {
        saveProject({
          instrument: currentInstrument as InstrumentName,
          songTitle: currentSongTitle,
          description: currentDescription,
          youtubeUrl: currentYoutubeUrl,
          bpm: currentBpm,
          notes: currentNotes,
          mediaSource: currentMediaSource,
          audioFileName: currentAudioFileName,
          sheetMusicId: currentSheetMusicId,
          sheetMusicTitle: currentSheetMusicTitle,
          lastPracticedAt: new Date().toISOString(),
        });
      }

      const player = youtubePlayerRef.current?.getPlayer();
      if (player) {
        player.destroy();
      }

      cleanupTools();

      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      setInstrument("");
      setSongTitle("");
      setDescription("");
      setNotes("");
      setYoutubeUrl("");
      setMediaSource("youtube");
      resetUploadedAudio();
      setPlaybackSpeed(1);
      setElapsedSeconds(0);
      clearStoredSessionSnapshot();

      router.push("/dashboard");
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

  // ─── Media handlers ──────────────────────────────────────────────────
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

  const handleAudioFileSelect = (file: File) => {
    if (audioObjectUrl) {
      URL.revokeObjectURL(audioObjectUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setAudioObjectUrl(nextUrl);
    setAudioFileName(file.name);
    setMediaSource("audio");
    setPlaybackSpeed(1);
  };

  // ─── Metronome engine ────────────────────────────────────────────────
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

  const handleMetronomeToggle = useCallback(() => {
    if (metronomeActive) {
      handleMetronomeStop();
    } else {
      handleMetronomeStart();
    }
  }, [metronomeActive, handleMetronomeStop, handleMetronomeStart]);

  // ─── Tuner engine ────────────────────────────────────────────────────
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

  const handleTunerToggle = useCallback(() => {
    if (tunerActive) {
      stopTuner();
    } else {
      void startTuner();
    }
  }, [tunerActive, stopTuner, startTuner]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">

        {/* ── Setup Mode ──────────────────────────────────────────── */}
        {!isRunning && (
          <div className="mx-auto max-w-3xl space-y-6">
            {/* Session header card */}
            <div className="rounded-xl bg-card p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Session Setup
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                {instrument ? `${instrument} Session` : "New Session"}
                {songTitle && (
                  <span className="block mt-1 text-lg font-semibold text-muted-foreground">
                    {songTitle}
                  </span>
                )}
              </h1>

              <div className="mt-6 rounded-xl bg-muted/50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      Session Clock
                    </p>
                    <div className="mt-2 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-card px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.05em] text-muted-foreground">
                      State
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      Ready to start
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent session / stored setup banners */}
            {storedSetup?.mediaSource === "audio" && storedSetup.audioFileName && (
              <div className="rounded-xl bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">
                  Last Media Source
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {storedSetup.audioFileName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your last setup used a local MP3. Re-upload this track to keep the same loop and slowdown workflow.
                </p>
              </div>
            )}

            {recentSession && (
              <div className="rounded-xl bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">
                      Last Setup Ready
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {recentSession.instrument}
                      {recentSession.description ? ` \u00B7 ${recentSession.description}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      From {recentSession.session_date}
                      {recentSession.youtube_url ? " \u00B7 YouTube source restored" : " \u00B7 Add media or start immediately"}
                    </p>
                    {restoredFromRecent && (
                      <p className="mt-1 text-xs font-medium text-accent">
                        Your last setup has been loaded so you can jump straight back in.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => applyRecentSession(recentSession)}
                      className="rounded-lg"
                    >
                      Use Last Setup
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSetup}
                      className="rounded-lg"
                    >
                      Start Fresh
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Setup form */}
            <div className="rounded-xl bg-card p-5">
              <SessionSetupForm
                instrument={instrument}
                songTitle={songTitle}
                description={description}
                notes={notes}
                youtubeUrl={youtubeUrl}
                mediaSource={mediaSource}
                audioFileName={audioFileName}
                isLoading={isLoading}
                error={error}
                onInstrumentChange={setInstrument}
                onSongTitleChange={setSongTitle}
                onDescriptionChange={setDescription}
                onNotesChange={setNotes}
                onYoutubeUrlChange={setYoutubeUrl}
                onMediaSourceChange={setMediaSource}
                onAudioFileSelect={handleAudioFileSelect}
                sheetMusicId={sheetMusicId}
                sheetMusicTitle={sheetMusicTitle}
                onSheetMusicDetach={() => {
                  setSheetMusicId(null);
                  setSheetMusicTitle(null);
                }}
                onOpenSheetMusicPicker={() => setShowSheetMusicPicker(true)}
                onStart={handleStart}
              />
            </div>
          </div>
        )}

        {/* ── Active Session Mode ─────────────────────────────────── */}
        {isRunning && (
          <div className="space-y-6">
            {/* Status bar */}
            <div className="rounded-xl bg-card p-4 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-primary">
                    Session Active
                  </p>
                  <span className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                    {formatTime(elapsedSeconds)}
                  </span>
                  {isPaused && (
                    <span className="rounded-lg bg-muted px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
                      Paused
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground mr-2">
                    {instrument}{songTitle ? ` \u00B7 ${songTitle}` : ""}
                  </p>

                  {error && (
                    <p className="text-sm font-medium text-destructive mr-2">{error}</p>
                  )}

                  {isPaused ? (
                    <Button
                      onClick={handleResume}
                      disabled={isLoading}
                      className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      {isLoading ? "Resuming..." : "Resume"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePause}
                      disabled={isLoading}
                      variant="secondary"
                      className="rounded-lg"
                    >
                      <Pause className="mr-1.5 h-4 w-4" />
                      {isLoading ? "Pausing..." : "Pause"}
                    </Button>
                  )}
                  <Button
                    onClick={handleStop}
                    disabled={isLoading}
                    variant="destructive"
                    className="rounded-lg"
                  >
                    <Square className="mr-1.5 h-4 w-4" />
                    {isLoading ? "Stopping..." : "Stop & Save"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Main workspace: media + metronome */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <PracticeMedia
                instrument={instrument}
                songTitle={songTitle}
                mediaSource={mediaSource}
                youtubeUrl={youtubeUrl}
                audioObjectUrl={audioObjectUrl}
                audioFileName={audioFileName}
                playbackSpeed={playbackSpeed}
                youtubePlayerRef={youtubePlayerRef}
                audioPlayerRef={audioPlayerRef}
                getLoopController={getLoopController}
                onMediaSourceChange={setMediaSource}
                onPlaybackSpeedChange={handleSpeedChange}
              />
              <MetronomeWidget
                bpm={bpm}
                isActive={metronomeActive}
                currentBeat={currentBeat}
                beatsPerMeasure={beatsPerMeasure}
                onBpmChange={handleBpmChange}
                onBeatsPerMeasureChange={setBeatsPerMeasure}
                onToggle={handleMetronomeToggle}
                onTapTempo={handleTapTempo}
              />
            </div>

            {/* Sheet music viewer */}
            {sheetMusicId && sheetMusicTitle && (
              <SheetMusicWidget
                sheetMusicId={sheetMusicId}
                title={sheetMusicTitle}
                pageCount={sheetMusicPageCount}
                initialPage={sheetMusicInitialPage}
              />
            )}

            {/* Tools row: recorder + tuner + performance */}
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-4">
                  Take Recorder
                </p>
                <TakeRecorder />
              </div>
              <TunerWidget
                isActive={tunerActive}
                note={tunerNote}
                error={tunerError}
                onToggle={handleTunerToggle}
              />
              <SessionPerformance elapsedSeconds={elapsedSeconds} />
            </div>

            {/* Focus points */}
            <FocusPoints notes={notes} onNotesChange={setNotes} />
          </div>
        )}
      </div>

      <SheetMusicPicker
        open={showSheetMusicPicker}
        onClose={() => setShowSheetMusicPicker(false)}
        onSelect={(sheet) => {
          setSheetMusicId(sheet.id);
          setSheetMusicTitle(sheet.title);
          setSheetMusicPageCount(sheet.page_count);
          setSheetMusicInitialPage(sheet.last_page_viewed);
        }}
      />
    </div>
  );
}
