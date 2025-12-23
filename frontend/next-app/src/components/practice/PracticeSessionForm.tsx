"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagSelector } from "./TagSelector";

export interface PracticeSession {
  session_id?: number;
  display_id?: number;
  user?: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
}

interface PracticeSessionFormProps {
  practiceSessionData?: PracticeSession;
  setPracticeSessions: React.Dispatch<React.SetStateAction<PracticeSession[]>>;
}

const PracticeSessionForm: React.FC<PracticeSessionFormProps> = ({ practiceSessionData, setPracticeSessions }) => {
  const [formData, setFormData] = useState<PracticeSession>({
    instrument: practiceSessionData?.instrument || '',
    duration: practiceSessionData?.duration || '',
    description: practiceSessionData?.description || '',
    session_date: practiceSessionData?.session_date || '',
  });

  const [allSessions, setAllSessions] = useState<PracticeSession[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSessionIdForDeletion, setSelectedSessionIdForDeletion] = useState<number | ''>('');
  const [selectedSessionIdForUpdate, setSelectedSessionIdForUpdate] = useState<number | ''>('');
  const [error, setError] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    fetchSessions();
    fetchUserDetails();
  }, []);

  const fetchSessions = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${apiBaseUrl}/`, {
          headers: { Authorization: `Token ${token}` }
        });
        setAllSessions(response.data);
      } catch (error) {
        setError('Failed to fetch sessions');
      }
    }
  };

  const fetchUserDetails = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${apiBaseUrl}/current-user/`, {
          headers: { Authorization: `Token ${token}` }
        });
        setFormData(currentFormData => ({
          ...currentFormData,
          user: response.data.id
        }));
      } catch (error) {
        setError('Failed to fetch user details');
      }
    }
  };

  const handleSessionSelectForUpdate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = Number(e.target.value);
    setSelectedSessionIdForUpdate(sessionId);
    if (sessionId === 0) {
      setFormData({
        instrument: '',
        duration: '',
        description: '',
        session_date: '',
      });
    } else {
      const selectedSession = allSessions.find(session => session.session_id === sessionId);
      if (selectedSession) {
        setFormData(selectedSession);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.user) {
      setError('User ID is not set. Unable to create session.');
      return;
    }

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Token ${token}` };
    const url = selectedSessionIdForUpdate ? `${apiBaseUrl}/${selectedSessionIdForUpdate}/` : `${apiBaseUrl}/`;

    // Include tags in the request
    const requestData = {
      ...formData,
      tag_ids: selectedTags,
    };

    try {
      const method = selectedSessionIdForUpdate ? 'put' : 'post';
      const response = await axios({ method, url, data: requestData, headers });

      setPracticeSessions(prev => selectedSessionIdForUpdate
        ? prev.map(s => s.session_id === selectedSessionIdForUpdate ? response.data : s)
        : [...prev, response.data]);

      setAllSessions(prev => selectedSessionIdForUpdate
        ? prev.map(s => s.session_id === selectedSessionIdForUpdate ? response.data : s)
        : [...prev, response.data]);

      setFormData({
        instrument: '',
        duration: '',
        description: '',
        session_date: '',
      });
      setSelectedTags([]);
      setSelectedSessionIdForUpdate('');
      window.location.reload();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError('Error: ' + err.response?.data?.message || err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSessionChangeForDeletion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSessionIdForDeletion(Number(e.target.value));
  };

  const handleSessionDeletion = async () => {
    if (!selectedSessionIdForDeletion) {
      setError('No session selected for deletion.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this session?')) {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Token ${token}` };
      try {
        await axios.delete(`${apiBaseUrl}/${selectedSessionIdForDeletion}/`, { headers });
        setAllSessions(prev => prev.filter(s => s.session_id !== selectedSessionIdForDeletion));
        setPracticeSessions(prev => prev.filter(s => s.session_id !== selectedSessionIdForDeletion));
        setSelectedSessionIdForDeletion('');
        window.location.reload();
      } catch (error) {
        setError('Failed to delete the session');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="my-8 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="session-select">Select Session</Label>
        <select
          id="session-select"
          value={selectedSessionIdForUpdate}
          onChange={handleSessionSelectForUpdate}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="0">Create New Session</option>
          {allSessions.map((session, index) => {
            const displayNumber = index + 1;
            return (
              <option key={session.session_id} value={session.session_id}>
                Session {displayNumber} - {session.instrument}
              </option>
            );
          })}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="instrument">Instrument</Label>
          <Input
            id="instrument"
            type="text"
            name="instrument"
            value={formData.instrument}
            onChange={handleChange}
            placeholder="Instrument"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (HH:MM:SS)</Label>
          <Input
            id="duration"
            type="text"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="Duration (e.g., 01:30:00)"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="session_date">Session Date</Label>
          <Input
            id="session_date"
            type="date"
            name="session_date"
            value={formData.session_date}
            onChange={handleChange}
            required
          />
        </div>

        {/* Tag Selector */}
        <TagSelector
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          apiBaseUrl={apiBaseUrl}
          token={localStorage.getItem('token') || ''}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {selectedSessionIdForUpdate ? 'Update Session' : 'Add Session'}
        </Button>
      </form>

      <div className="space-y-2">
        <Label htmlFor="delete-select">Delete Session</Label>
        <select
          id="delete-select"
          value={selectedSessionIdForDeletion}
          onChange={handleSessionChangeForDeletion}
          disabled={isSubmitting}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Select a session to delete</option>
          {allSessions.map((session, index) => {
            const displayNumber = index + 1;
            return (
              <option key={session.session_id} value={session.session_id}>
                Session {displayNumber} - {session.instrument}
              </option>
            );
          })}
        </select>
        <Button
          onClick={handleSessionDeletion}
          disabled={!selectedSessionIdForDeletion || isSubmitting}
          variant="destructive"
          className="w-full"
        >
          Delete Selected Session
        </Button>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
};

export default PracticeSessionForm;
