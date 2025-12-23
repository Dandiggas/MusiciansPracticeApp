"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PracticeChart from '../practice/PracticeChart';
import PracticeSessionForm from '../practice/PracticeSessionForm';
import { PracticeSession } from '../practice/PracticeSessionForm';
import LogoutButton from '../practice/LogoutButton';
import { PracticeCalendarHeatmap } from '../charts/CalendarHeatmap';
import { InstrumentBreakdown } from '../charts/InstrumentBreakdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Session {
  session_id: number;
  display_id?: number;
  user: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
}

const ProfilePage = () => {
  const [username, setUsername] = useState('');
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No token found');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user details
        const userResponse = await axios.get(`${apiBaseUrl}/current-user/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setUsername(userResponse.data.username);

        // Fetch sessions
        const sessionResponse = await axios.get(`${apiBaseUrl}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setSessions(sessionResponse.data);
      } catch (error) {
        console.error('Error fetching data', error);
        setError('Error fetching data');
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">Error: {error}</div>;
  }

  const token = localStorage.getItem('token') || '';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Welcome, {username}!</h1>
          <p className="text-muted-foreground mt-1">Track your musical journey</p>
        </div>
        <LogoutButton />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 mb-8">
        {/* Calendar Heatmap */}
        <Card>
          <CardContent className="pt-6">
            <PracticeCalendarHeatmap token={token} apiBaseUrl={apiBaseUrl} />
          </CardContent>
        </Card>

        {/* Side by Side Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              {sessions.length > 0 && (
                <div className="h-80">
                  <PracticeChart sessions={sessions} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <InstrumentBreakdown token={token} apiBaseUrl={apiBaseUrl} days={30} />
            </CardContent>
          </Card>
        </div>
      </div>

      <h2 className="text-2xl font-bold my-5">Your Sessions</h2>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted">
              <th className="border-b px-4 py-3 text-left text-sm font-medium">Session ID</th>
              <th className="border-b px-4 py-3 text-left text-sm font-medium">Instrument</th>
              <th className="border-b px-4 py-3 text-left text-sm font-medium">Duration</th>
              <th className="border-b px-4 py-3 text-left text-sm font-medium">Description</th>
              <th className="border-b px-4 py-3 text-left text-sm font-medium">Session Date</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No sessions yet. Start your first practice session!
                </td>
              </tr>
            ) : (
              sessions.map((session, index) => {
                const displayNumber = index + 1;
                return (
                  <tr key={session.session_id} className="hover:bg-muted/50 transition-colors">
                    <td className="border-b px-4 py-3 text-center">{displayNumber}</td>
                    <td className="border-b px-4 py-3">{session.instrument}</td>
                    <td className="border-b px-4 py-3">{session.duration}</td>
                    <td className="border-b px-4 py-3">{session.description}</td>
                    <td className="border-b px-4 py-3">{session.session_date}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PracticeSessionForm
        setPracticeSessions={setPracticeSessions}
      />
    </div>
  );
};

export default ProfilePage;
