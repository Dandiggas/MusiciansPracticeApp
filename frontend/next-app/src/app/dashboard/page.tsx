"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Clock, TrendingUp, Flame, Music } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Stats {
  total_hours: number;
  total_sessions: number;
  week_hours: number;
  current_streak: number;
  favorite_instrument: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/stats/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats', error);
        setError('Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [apiBaseUrl, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your practice progress and stay motivated
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Practice Hours"
          value={stats.total_hours.toFixed(1)}
          description="All-time practice time"
          icon={Clock}
        />
        <StatsCard
          title="This Week"
          value={`${stats.week_hours.toFixed(1)}h`}
          description={`${stats.total_sessions} total sessions`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Current Streak"
          value={`${stats.current_streak} days`}
          description={stats.current_streak > 0 ? "Keep it up!" : "Start a new streak today!"}
          icon={Flame}
        />
        <StatsCard
          title="Favorite Instrument"
          value={stats.favorite_instrument}
          description="Most practiced"
          icon={Music}
        />
      </div>

      {/* Quick Actions Section */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          onClick={() => router.push('/practice-timer')}
          className="cursor-pointer rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h3 className="font-semibold mb-2">Start Practice Session</h3>
          <p className="text-sm text-muted-foreground">
            Begin timing your practice with our built-in timer
          </p>
        </div>
        <div
          onClick={() => router.push('/profilepage')}
          className="cursor-pointer rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h3 className="font-semibold mb-2">View All Sessions</h3>
          <p className="text-sm text-muted-foreground">
            See your complete practice history and charts
          </p>
        </div>
        <div className="cursor-pointer rounded-lg border bg-card p-6 hover:bg-accent transition-colors opacity-50 cursor-not-allowed">
          <h3 className="font-semibold mb-2">Practice Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            Get AI-powered practice suggestions (Coming soon)
          </p>
        </div>
      </div>

      {/* Motivation Section */}
      {stats.current_streak > 0 && (
        <div className="mt-8 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white">
          <h3 className="text-xl font-bold mb-2">
            🔥 {stats.current_streak} Day Streak!
          </h3>
          <p>
            You&apos;ve practiced for {stats.current_streak} days in a row. Don&apos;t break the streak!
          </p>
        </div>
      )}
    </div>
  );
}
