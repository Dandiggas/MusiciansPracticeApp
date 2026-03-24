"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Clock, Pause, Youtube, Minus, Plus, Mic, MicOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import YouTubePlayer, { extractVideoId, YouTubePlayerHandle } from '@/components/youtube/YouTubePlayer';
import PlaybackSpeedControl from '@/components/youtube/PlaybackSpeedControl';
import ABLoopControl from '@/components/youtube/ABLoopControl';
import { MetronomeEngine } from '@/lib/audio/metronome-engine';
import { detectPitch } from '@/lib/audio/pitch-detector';
import { frequencyToNote, type NoteInfo } from '@/lib/audio/note-utils';

const TIME_SIGNATURES = [
  { label: "2/4", beats: 2 },
  { label: "3/4", beats: 3 },
  { label: "4/4", beats: 4 },
  { label: "5/4", beats: 5 },
  { label: "6/8", beats: 6 },
  { label: "7/8", beats: 7 },
];

export default function PracticeTimerPage() {
  // === Timer state ===
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [instrument, setInstrument] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // === Metronome state ===
  const [bpm, setBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [, setTapTimes] = useState<number[]>([]);

  // === Tuner state ===
  const [tunerActive, setTunerActive] = useState(false);
  const [tunerNote, setTunerNote] = useState<NoteInfo | null>(null);
  const [referenceFreq, setReferenceFreq] = useState(440);
  const [tunerError, setTunerError] = useState("");

  // === Refs ===
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null);
  const router = useRouter();
  const metronomeRef = useRef<MetronomeEngine | null>(null);
  const tunerContextRef = useRef<AudioContext | null>(null);
  const tunerAnalyserRef = useRef<AnalyserNode | null>(null);
  const tunerStreamRef = useRef<MediaStream | null>(null);
  const tunerRafRef = useRef<number | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const videoId = extractVideoId(youtubeUrl);
  const hasVideo = Boolean(videoId);

  // === Cleanup all tools ===
  const cleanupTools = useCallback(() => {
    // Metronome
    metronomeRef.current?.stop();
    metronomeRef.current = null;
    setMetronomeActive(false);
    setCurrentBeat(-1);

    // Tuner
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

  // === Timer logic (unchanged) ===
  useEffect(() => {
    const checkActiveTimer = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/timer/active/`, {
          headers: { 'Authorization': `Token ${token}` }
        });

        if (response.data.active) {
          const session = response.data.session;
          setSessionId(session.session_id);
          setInstrument(session.instrument);
          setDescription(session.description);
          setYoutubeUrl(session.youtube_url || '');
          setIsRunning(true);
          setIsPaused(session.is_paused || false);

          const startTime = new Date(session.started_at).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.floor((now - startTime) / 1000));
        }
      } catch (error) {
        console.error('Error checking active timer', error);
      }
    };

    checkActiveTimer();
  }, [apiBaseUrl, router]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTools();
    };
  }, [cleanupTools]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!instrument.trim()) {
      setError('Please enter an instrument');
      return;
    }

    setIsLoading(true);
    setError('');

    const token = localStorage.getItem('token');

    try {
      const response = await axios.post(
        `${apiBaseUrl}/timer/start/`,
        { instrument, description, youtube_url: youtubeUrl },
        { headers: { 'Authorization': `Token ${token}` } }
      );

      setSessionId(response.data.session_id);
      setIsRunning(true);
      setElapsedSeconds(0);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to start timer');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/stop/`,
        {},
        { headers: { 'Authorization': `Token ${token}` } }
      );

      const player = youtubePlayerRef.current?.getPlayer();
      if (player) {
        player.destroy();
      }

      cleanupTools();

      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      setInstrument('');
      setDescription('');
      setYoutubeUrl('');
      setPlaybackSpeed(1);
      setElapsedSeconds(0);

      router.push('/profilepage');
    } catch {
      setError('Failed to stop timer');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/pause/`,
        {},
        { headers: { 'Authorization': `Token ${token}` } }
      );

      setIsPaused(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to pause timer');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    const token = localStorage.getItem('token');

    try {
      await axios.post(
        `${apiBaseUrl}/timer/${sessionId}/resume/`,
        {},
        { headers: { 'Authorization': `Token ${token}` } }
      );

      setIsPaused(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to resume timer');
      } else {
        setError('An unexpected error occurred');
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
  }, []);

  const getPlayer = useCallback(() => {
    return youtubePlayerRef.current?.getPlayer() ?? null;
  }, []);

  const handleUpdateYoutubeUrl = async (newUrl: string) => {
    setYoutubeUrl(newUrl);
    if (!sessionId) return;

    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `${apiBaseUrl}/${sessionId}/`,
        { youtube_url: newUrl },
        { headers: { 'Authorization': `Token ${token}` } }
      );
    } catch {
      console.error('Failed to save YouTube URL');
    }
  };

  // === Metronome logic ===
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
      const recent = [...prev, now].filter((t) => now - t < 3000);
      if (recent.length >= 2) {
        const intervals = [];
        for (let i = 1; i < recent.length; i++) {
          intervals.push(recent[i] - recent[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const tappedBpm = Math.round(60000 / avgInterval);
        handleBpmChange(tappedBpm);
      }
      return recent;
    });
  };

  // === Tuner logic ===
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
      setTunerError("Could not access microphone. Please allow microphone permissions.");
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

  const gaugePercent = tunerNote ? Math.max(0, Math.min(100, ((tunerNote.cents + 50) / 100) * 100)) : 50;
  const isInTune = tunerNote !== null && Math.abs(tunerNote.cents) <= 5;
  const isClose = tunerNote !== null && Math.abs(tunerNote.cents) <= 15;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Practice Session</h1>
        <p className="text-muted-foreground mt-2">
          All your practice tools in one place
        </p>
      </div>

      <div className={cn("mx-auto", isRunning ? "max-w-7xl" : "max-w-2xl")}>
        {/* Timer Card — always full width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isRunning ? (isPaused ? 'Session Paused' : 'Session in Progress') : 'Start New Session'}
            </CardTitle>
            <CardDescription>
              {isRunning
                ? (isPaused ? 'Your session is paused. Resume when ready.' : 'Your practice session is being tracked')
                : 'Enter your instrument and start practicing'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="text-center py-8">
              <div className="text-6xl md:text-7xl font-bold font-mono tracking-wider">
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {isRunning ? (isPaused ? '⏸ Paused' : 'Time elapsed') : 'Ready to start'}
              </p>
            </div>

            {/* Form */}
            {!isRunning && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instrument">Instrument *</Label>
                  <Input
                    id="instrument"
                    type="text"
                    value={instrument}
                    onChange={(e) => setInstrument(e.target.value)}
                    placeholder="e.g., Guitar, Piano, Drums"
                    required
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Scales practice, Song rehearsal"
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube-url" className="flex items-center gap-1.5">
                    <Youtube className="h-4 w-4" />
                    YouTube Video (Optional)
                  </Label>
                  <Input
                    id="youtube-url"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="e.g., https://www.youtube.com/watch?v=..."
                  />
                </div>
              </div>
            )}

            {isRunning && (
              <div className="space-y-2 p-4 rounded-lg bg-muted">
                <p className="text-sm font-medium">Current Session</p>
                <p className="text-sm"><strong>Instrument:</strong> {instrument}</p>
                {description && (
                  <p className="text-sm"><strong>Description:</strong> {description}</p>
                )}
              </div>
            )}

            {error && (
              <div className="text-sm font-medium text-destructive text-center">
                {error}
              </div>
            )}

            {/* Controls */}
            {!isRunning ? (
              <div className="flex gap-4">
                <Button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  {isLoading ? 'Starting...' : 'Start Practice'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                {isPaused ? (
                  <Button
                    onClick={handleResume}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    {isLoading ? 'Resuming...' : 'Resume'}
                  </Button>
                ) : (
                  <Button
                    onClick={handlePause}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    <Pause className="mr-2 h-5 w-5" />
                    {isLoading ? 'Pausing...' : 'Pause'}
                  </Button>
                )}
                <Button
                  onClick={handleStop}
                  disabled={isLoading}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="mr-2 h-5 w-5" />
                  {isLoading ? 'Stopping...' : 'Stop & Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tools Grid — visible during active session */}
        {isRunning && (
          <div className="grid gap-6 mt-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Metronome Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Metronome</CardTitle>
                <CardDescription>Keep time while you practice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold font-mono">{bpm}</div>
                  <p className="text-xs text-muted-foreground mt-1">BPM</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => handleBpmChange(bpm - 1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    value={bpm}
                    onChange={(e) => handleBpmChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <Button variant="outline" size="icon" onClick={() => handleBpmChange(bpm + 1)}>
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
                    className="w-20"
                  />
                  <Button variant="secondary" size="sm" onClick={handleTapTempo} className="flex-1">
                    Tap Tempo
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Time Signature</Label>
                  <div className="flex flex-wrap gap-1">
                    {TIME_SIGNATURES.map((ts) => (
                      <Button
                        key={ts.label}
                        variant={beatsPerMeasure === ts.beats ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBeatsPerMeasure(ts.beats)}
                        className="text-xs px-2"
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
                        "w-5 h-5 rounded-full border-2 transition-colors duration-100",
                        currentBeat === i
                          ? i === 0
                            ? "bg-primary border-primary scale-110"
                            : "bg-secondary border-secondary"
                          : "border-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                <Button
                  onClick={metronomeActive ? handleMetronomeStop : handleMetronomeStart}
                  className="w-full"
                  variant={metronomeActive ? "destructive" : "default"}
                >
                  {metronomeActive ? (
                    <><Square className="mr-2 h-4 w-4" /> Stop</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Start</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tuner Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tuner</CardTitle>
                <CardDescription>Tune with your microphone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-2">
                  <div
                    className={cn(
                      "text-6xl font-bold font-mono transition-colors",
                      !tunerNote && "text-muted-foreground/30",
                      tunerNote && isInTune && "text-green-500",
                      tunerNote && !isInTune && isClose && "text-yellow-500",
                      tunerNote && !isInTune && !isClose && "text-red-500"
                    )}
                  >
                    {tunerNote ? `${tunerNote.name}${tunerNote.octave}` : "--"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tunerNote
                      ? `${tunerNote.frequency.toFixed(1)} Hz`
                      : tunerActive
                        ? "Play a note..."
                        : "Press Start to begin"}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Flat</span>
                    <span>In Tune</span>
                    <span>Sharp</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-green-500 z-10" />
                    <div
                      className={cn(
                        "absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 -translate-x-1/2",
                        isInTune ? "bg-green-500" : isClose ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ left: `${gaugePercent}%` }}
                    />
                  </div>
                  <div className="text-center text-sm font-mono">
                    {tunerNote ? `${tunerNote.cents > 0 ? "+" : ""}${tunerNote.cents} cents` : "-- cents"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="ref-freq-grid" className="text-xs shrink-0">A4 =</Label>
                  <Input
                    id="ref-freq-grid"
                    type="number"
                    min={420}
                    max={460}
                    value={referenceFreq}
                    onChange={(e) => setReferenceFreq(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">Hz</span>
                </div>

                {tunerError && (
                  <div className="text-xs font-medium text-destructive text-center">{tunerError}</div>
                )}

                <Button
                  onClick={tunerActive ? stopTuner : startTuner}
                  className="w-full"
                  variant={tunerActive ? "destructive" : "default"}
                >
                  {tunerActive ? (
                    <><MicOff className="mr-2 h-4 w-4" /> Stop Tuner</>
                  ) : (
                    <><Mic className="mr-2 h-4 w-4" /> Start Tuner</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* YouTube Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Youtube className="h-5 w-5" />
                  YouTube
                </CardTitle>
                <CardDescription>Play along with a video</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasVideo ? (
                  <>
                    <YouTubePlayer
                      ref={youtubePlayerRef}
                      videoId={videoId!}
                      onReady={(player) => {
                        if (playbackSpeed !== 1) {
                          player.setPlaybackRate(playbackSpeed);
                        }
                      }}
                    />
                    <PlaybackSpeedControl
                      currentSpeed={playbackSpeed}
                      onSpeedChange={handleSpeedChange}
                    />
                    <ABLoopControl getPlayer={getPlayer} />
                  </>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="youtube-url-grid" className="text-xs text-muted-foreground">
                    {hasVideo ? "Change video URL" : "Paste a YouTube URL"}
                  </Label>
                  <Input
                    id="youtube-url-grid"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => handleUpdateYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tips Card — only when not in session */}
        {!isRunning && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Practice Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Set a goal before starting your session</li>
                <li>• Take short breaks every 25-30 minutes</li>
                <li>• Practice slowly first, then gradually increase tempo</li>
                <li>• Record yourself to track improvement</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
