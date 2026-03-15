"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Square, Clock, Pause, Youtube } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import YouTubePlayer, { extractVideoId, YouTubePlayerHandle } from '@/components/youtube/YouTubePlayer';
import PlaybackSpeedControl from '@/components/youtube/PlaybackSpeedControl';
import ABLoopControl from '@/components/youtube/ABLoopControl';

export default function PracticeTimerPage() {
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle>(null);
  const router = useRouter();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  const videoId = extractVideoId(youtubeUrl);
  const hasVideo = Boolean(videoId);

  useEffect(() => {
    // Check if there's an active timer
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

          // Calculate elapsed time
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

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);

      // Second beep
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.1);
      osc2.start(audioContext.currentTime + 0.3);
      osc2.stop(audioContext.currentTime + 1.1);
      osc2.onended = () => {
        audioContext.close();
      };
    } catch {
      // Audio not supported, silent fallback
    }
  };

  const notifySessionComplete = (duration: string) => {
    playCompletionSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Practice Session Complete!', {
        body: `Great work! You practiced ${instrument} for ${duration}.`,
      });
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

      const completedDuration = formatTime(elapsedSeconds);
      notifySessionComplete(completedDuration);

      // Clean up YouTube player
      const player = youtubePlayerRef.current?.getPlayer();
      if (player) {
        player.destroy();
      }

      setIsRunning(false);
      setIsPaused(false);
      setSessionId(null);
      setInstrument('');
      setDescription('');
      setYoutubeUrl('');
      setPlaybackSpeed(1);
      setElapsedSeconds(0);

      // Redirect to profile page to see the completed session
      router.push('/profilepage');
    } catch (error) {
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
      // Non-critical: URL still works locally even if save fails
      console.error('Failed to save YouTube URL');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Practice Timer</h1>
        <p className="text-muted-foreground mt-2">
          Track your practice sessions in real-time
        </p>
      </div>

      <div className={cn(
        "grid gap-6 mx-auto",
        hasVideo && isRunning ? "lg:grid-cols-2 max-w-6xl" : "max-w-2xl"
      )}>
        {/* Left column: Timer */}
        <div className="space-y-6">
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

              {/* Mid-session YouTube URL input */}
              {isRunning && !hasVideo && (
                <div className="space-y-2">
                  <Label htmlFor="youtube-url-mid" className="flex items-center gap-1.5 text-sm">
                    <Youtube className="h-4 w-4" />
                    Add a YouTube video
                  </Label>
                  <Input
                    id="youtube-url-mid"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => handleUpdateYoutubeUrl(e.target.value)}
                    placeholder="Paste a YouTube URL..."
                  />
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
                <div className="flex flex-col gap-4">
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

              {isRunning && (
                <p className="text-xs text-center text-muted-foreground">
                  {isPaused
                    ? 'Session paused. Click "Resume" to continue or "Stop & Save" to end.'
                    : 'Click "Pause" to take a break, or "Stop & Save" to end your session.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          {!isRunning && (
            <Card>
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

        {/* Right column: YouTube Player */}
        {hasVideo && isRunning && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Youtube className="h-5 w-5" />
                  YouTube Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* Change video URL */}
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="youtube-url-change" className="text-xs text-muted-foreground">
                    Change video URL
                  </Label>
                  <Input
                    id="youtube-url-change"
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => handleUpdateYoutubeUrl(e.target.value)}
                    placeholder="Paste a different YouTube URL..."
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
