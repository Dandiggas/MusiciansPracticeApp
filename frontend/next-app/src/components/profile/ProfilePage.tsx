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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Session {
  session_id: number;
  display_id?: number;
  user: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
  youtube_url?: string;
}

const ProfilePage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 10;

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
        setEmail(userResponse.data.email || '');
        setName(userResponse.data.name || '');

        // Fetch sessions
        const sessionResponse = await axios.get(`${apiBaseUrl}/`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setSessions(sessionResponse.data);
        // Keep practiceSessions in sync with sessions so mutations from the form
        // are reflected in the main sessions list and charts.
        setPracticeSessions(sessionResponse.data as PracticeSession[]);
      } catch (error) {
        console.error('Error fetching data', error);
        setError('Error fetching data');
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  // Whenever practiceSessions changes (e.g., via PracticeSessionForm),
  // update sessions so all charts/tables using sessions see the latest data.
  useEffect(() => {
    setSessions(practiceSessions as unknown as Session[]);
  }, [practiceSessions]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
          <div>
            <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded-md mt-2" />
          </div>
        </div>
        <div className="grid gap-6 mb-8">
          <div className="rounded-lg border bg-card p-6">
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-6">
              <div className="h-80 bg-muted animate-pulse rounded" />
            </div>
            <div className="rounded-lg border bg-card p-6">
              <div className="h-80 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen">Error: {error}</div>;
  }

  const token = localStorage.getItem('token') || '';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Welcome, {name || username}!</h1>
          <p className="text-muted-foreground mt-1">Track your musical journey</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditName(name);
              setEditEmail(email);
              setIsEditingProfile(!isEditingProfile);
              setProfileSaveError('');
              setProfileSaveSuccess(false);
            }}
          >
            {isEditingProfile ? 'Cancel' : 'Edit Profile'}
          </Button>
          <LogoutButton />
        </div>
      </div>

      {isEditingProfile && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileSaveError('');
                setProfileSaveSuccess(false);
                const token = localStorage.getItem('token');
                try {
                  const response = await axios.patch(
                    `${apiBaseUrl}/update-profile/`,
                    { name: editName, email: editEmail },
                    { headers: { Authorization: `Token ${token}` } }
                  );
                  setName(response.data.name || '');
                  setEmail(response.data.email || '');
                  setUsername(response.data.username);
                  setProfileSaveSuccess(true);
                  setTimeout(() => {
                    setProfileSaveSuccess(false);
                    setIsEditingProfile(false);
                  }, 1500);
                } catch (err) {
                  if (axios.isAxiosError(err) && err.response?.data) {
                    const data = err.response.data;
                    const messages = Object.entries(data)
                      .map(([key, val]) => `${key}: ${val}`)
                      .join(', ');
                    setProfileSaveError(messages || 'Failed to update profile');
                  } else {
                    setProfileSaveError('Failed to update profile');
                  }
                }
              }}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              {profileSaveError && (
                <p className="text-sm font-medium text-destructive">{profileSaveError}</p>
              )}
              {profileSaveSuccess && (
                <p className="text-sm font-medium text-green-600">Profile updated!</p>
              )}
              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>
      )}

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

      {/* Search and Filter Controls */}
      {sessions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="sm:max-w-xs"
          />
          <select
            value={instrumentFilter}
            onChange={(e) => { setInstrumentFilter(e.target.value); setCurrentPage(1); }}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-[200px]"
          >
            <option value="">All Instruments</option>
            {[...new Set(sessions.map(s => s.instrument))].sort().map(inst => (
              <option key={inst} value={inst}>{inst}</option>
            ))}
          </select>
        </div>
      )}

      {(() => {
        const filteredSessions = sessions.filter(session => {
          const matchesSearch = !searchQuery ||
            session.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.instrument.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesInstrument = !instrumentFilter || session.instrument === instrumentFilter;
          return matchesSearch && matchesInstrument;
        });

        const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
        const startIndex = (currentPage - 1) * sessionsPerPage;
        const paginatedSessions = filteredSessions.slice(startIndex, startIndex + sessionsPerPage);

        return (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">#</th>
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">Instrument</th>
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">Duration</th>
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">Description</th>
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">Session Date</th>
                    <th className="border-b px-4 py-3 text-left text-sm font-medium">Video</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        {sessions.length === 0
                          ? 'No sessions yet. Start your first practice session!'
                          : 'No sessions match your search.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedSessions.map((session, index) => (
                      <tr key={session.session_id} className="hover:bg-muted/50 transition-colors">
                        <td className="border-b px-4 py-3 text-center">{startIndex + index + 1}</td>
                        <td className="border-b px-4 py-3">{session.instrument}</td>
                        <td className="border-b px-4 py-3">{session.duration}</td>
                        <td className="border-b px-4 py-3">{session.description}</td>
                        <td className="border-b px-4 py-3">{session.session_date}</td>
                        <td className="border-b px-4 py-3">
                          {session.youtube_url ? (
                            <a
                              href={session.youtube_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-sm">--</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + sessionsPerPage, filteredSessions.length)} of {filteredSessions.length} sessions
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {[...Array(totalPages)].map((_, i) => (
                    <Button
                      key={i}
                      variant={currentPage === i + 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                      className="min-w-[2.25rem]"
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      <PracticeSessionForm
        setPracticeSessions={setPracticeSessions}
      />
    </div>
  );
};

export default ProfilePage;
