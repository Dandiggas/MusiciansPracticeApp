import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import PracticeTimerPage from '../page';

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  isAxiosError: jest.fn(),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock next/navigation with mutable search params
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock audio APIs that don't exist in jsdom
jest.mock('@/lib/audio/metronome-engine', () => ({
  MetronomeEngine: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    setBpm: jest.fn(),
    setBeatsPerMeasure: jest.fn(),
    setOnBeat: jest.fn(),
  })),
}));

jest.mock('@/lib/audio/pitch-detector', () => ({
  detectPitch: jest.fn().mockReturnValue(null),
}));

jest.mock('@/lib/audio/note-utils', () => ({
  frequencyToNote: jest.fn().mockReturnValue({ name: 'A', octave: 4, cents: 0, frequency: 440 }),
}));

// Mock practice-session-store with all exports
const mockGetProject = jest.fn().mockReturnValue(null);
const mockSaveProject = jest.fn();
jest.mock('@/lib/practice-session-store', () => ({
  getStoredPracticeSetup: jest.fn().mockReturnValue(null),
  saveStoredPracticeSetup: jest.fn(),
  clearStoredPracticeSetup: jest.fn(),
  getStoredSessionSnapshot: jest.fn().mockReturnValue(null),
  saveStoredSessionSnapshot: jest.fn(),
  clearStoredSessionSnapshot: jest.fn(),
  getProject: (...args: unknown[]) => mockGetProject(...args),
  saveProject: (...args: unknown[]) => mockSaveProject(...args),
  INSTRUMENTS: ['Guitar', 'Bass', 'Drums', 'Keys'] as const,
}));

// Mock heavy components that don't need testing here
jest.mock('@/components/youtube/YouTubePlayer', () => {
  return {
    __esModule: true,
    default: jest.fn().mockReturnValue(null),
    extractVideoId: jest.fn().mockReturnValue(null),
  };
});

jest.mock('@/components/media/TakeRecorder', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(null),
}));

// Mock studio components that are heavy / not under test
jest.mock('@/components/studio/PracticeMedia', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(<div data-testid="practice-media" />),
}));

jest.mock('@/components/studio/MetronomeWidget', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(<div data-testid="metronome-widget" />),
}));

jest.mock('@/components/studio/TunerWidget', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(<div data-testid="tuner-widget" />),
}));

jest.mock('@/components/studio/SessionPerformance', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(<div data-testid="session-performance" />),
}));

jest.mock('@/components/studio/FocusPoints', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(<div data-testid="focus-points" />),
}));

describe('PracticeTimerPage', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    jest.useFakeTimers();
    mockSearchParams = new URLSearchParams();
    // Suppress React "Maximum update depth exceeded" warnings in tests
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Maximum update depth exceeded')) return;
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    console.error = originalConsoleError;
  });

  /** Helper: mock the two GETs the mount effect makes (active-timer + recent sessions) */
  function mockNoActiveSession() {
    mockedAxios.get
      .mockResolvedValueOnce({ data: { active: false } })   // /timer/active/
      .mockResolvedValueOnce({ data: [] });                  // recent sessions
  }

  describe('Initial Render', () => {
    it('renders the practice timer page with initial state', async () => {
      mockNoActiveSession();

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByText('Session Setup')).toBeInTheDocument();
        expect(screen.getByText('New Session')).toBeInTheDocument();
        expect(screen.getByText('00:00:00')).toBeInTheDocument();
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });
    });

    it('checks for active timer on mount', async () => {
      mockNoActiveSession();

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/active/',
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });
    });

    it('restores active session if one exists', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: 'Test practice',
        started_at: new Date(Date.now() - 60000).toISOString(), // Started 1 minute ago
        is_paused: false,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
        // Form is hidden when session is running, so check for pause/stop buttons instead
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop & save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Launch Pad Integration', () => {
    it('pre-fills form from project store when ?instrument= param is present', async () => {
      mockSearchParams = new URLSearchParams('instrument=Guitar');
      mockGetProject.mockReturnValueOnce({
        instrument: 'Guitar',
        songTitle: 'All The Things You Are',
        description: 'Chord melody arrangement',
        youtubeUrl: 'https://youtube.com/watch?v=test123',
        bpm: 140,
        notes: 'Focus on bridge section',
        mediaSource: 'youtube',
        audioFileName: null,
        lastPracticedAt: '2026-03-29T10:00:00Z',
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(mockGetProject).toHaveBeenCalledWith('Guitar');
        const instrumentSelect = screen.getByLabelText(/instrument/i) as HTMLSelectElement;
        expect(instrumentSelect.value).toBe('Guitar');
        expect(screen.getByDisplayValue('All The Things You Are')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Chord melody arrangement')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Focus on bridge section')).toBeInTheDocument();
      });
    });

    it('sets only instrument when ?instrument= param has no existing project', async () => {
      mockSearchParams = new URLSearchParams('instrument=Bass');
      mockGetProject.mockReturnValueOnce(null);
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(mockGetProject).toHaveBeenCalledWith('Bass');
        const instrumentSelect = screen.getByLabelText(/instrument/i) as HTMLSelectElement;
        expect(instrumentSelect.value).toBe('Bass');
      });
    });

    it('calls saveProject on session start', async () => {
      mockNoActiveSession();
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 1,
          instrument: 'Guitar',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: true,
        }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });

      const instrumentSelect = screen.getByLabelText(/instrument/i);
      await user.selectOptions(instrumentSelect, 'Guitar');

      const startButton = screen.getByRole('button', { name: /start session/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockSaveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            instrument: 'Guitar',
            lastPracticedAt: expect.any(String),
          })
        );
      });
    });

    it('calls saveProject on session stop and redirects to dashboard', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: 'Test',
        started_at: new Date().toISOString(),
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, in_progress: false }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop & save/i })).toBeInTheDocument();
      });

      const stopButton = screen.getByRole('button', { name: /stop & save/i });
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockSaveProject).toHaveBeenCalledWith(
          expect.objectContaining({
            instrument: 'Guitar',
            lastPracticedAt: expect.any(String),
          })
        );
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Song Title and Notes', () => {
    it('renders song title input', async () => {
      mockNoActiveSession();

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/song title/i)).toBeInTheDocument();
      });
    });

    it('renders notes textarea', async () => {
      mockNoActiveSession();

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/focus points/i)).toBeInTheDocument();
      });
    });
  });

  describe('Start Timer', () => {
    it('starts a new timer with instrument', async () => {
      mockNoActiveSession();
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 1,
          instrument: 'Drums',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: true,
        }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });

      const instrumentSelect = screen.getByLabelText(/instrument/i);
      await user.selectOptions(instrumentSelect, 'Drums');

      const startButton = screen.getByRole('button', { name: /start session/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/start/',
          { instrument: 'Drums', description: '', youtube_url: '' },
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });
    });

    it('displays error when starting without instrument', async () => {
      mockNoActiveSession();

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument();
      });

      // Try to start without selecting an instrument
      const startButton = screen.getByRole('button', { name: /start session/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter an instrument/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('increments timer after starting', async () => {
      mockNoActiveSession();
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 1,
          instrument: 'Drums',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: true,
        }
      });

      const user = userEvent.setup({ delay: null, advanceTimers: jest.advanceTimersByTime });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });

      const instrumentSelect = screen.getByLabelText(/instrument/i);
      await user.selectOptions(instrumentSelect, 'Drums');

      const startButton = screen.getByRole('button', { name: /start session/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });

      // Fast-forward 3 seconds and let React process the update
      jest.advanceTimersByTime(3000);

      // Use waitFor to allow time for React to update
      await waitFor(() => {
        const timerElements = screen.getAllByText(/00:00:0[3-9]/);
        expect(timerElements.length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });
  });

  describe('Pause/Resume Functionality', () => {
    it('pauses an active timer', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, is_paused: true }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/1/pause/',
          {},
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Paused')).toBeInTheDocument();
      });
    });

    it('resumes a paused timer', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: true,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, is_paused: false }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      });

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await user.click(resumeButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/1/resume/',
          {},
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Session Active')).toBeInTheDocument();
      });
    });

    it('stops timer countdown when paused', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, is_paused: true }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText('Paused')).toBeInTheDocument();
      });

      // Fast-forward another 5 seconds while paused
      jest.advanceTimersByTime(5000);

      // Timer should not have advanced
      await waitFor(() => {
        const timeElements = screen.getAllByText(/00:00:0[2-3]/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stop Timer', () => {
    it('stops timer and redirects to dashboard', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, in_progress: false }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop & save/i })).toBeInTheDocument();
      });

      const stopButton = screen.getByRole('button', { name: /stop & save/i });
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/1/stop/',
          {},
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('can stop a paused timer', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: true,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { ...mockSession, in_progress: false }
      });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop & save/i })).toBeInTheDocument();
      });

      const stopButton = screen.getByRole('button', { name: /stop & save/i });
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/1/stop/',
          {},
          expect.any(Object)
        );
      });
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly for hours, minutes, and seconds', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date(Date.now() - 3665000).toISOString(), // 1 hour, 1 minute, 5 seconds ago
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        const timeElements = screen.getAllByText(/01:01:0[5-9]/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when pause fails', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: false,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      const axiosError = {
        response: { data: { error: 'Session is already paused' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
      });

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      await waitFor(() => {
        expect(screen.getByText(/session is already paused/i)).toBeInTheDocument();
      });
    });

    it('displays error message when resume fails', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: true,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });
      const axiosError = {
        response: { data: { error: 'Session is not paused' } },
        isAxiosError: true,
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);
      (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      });

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await user.click(resumeButton);

      await waitFor(() => {
        expect(screen.getByText(/session is not paused/i)).toBeInTheDocument();
      });
    });
  });

  describe('UI State Changes', () => {
    it('disables buttons while loading', async () => {
      mockNoActiveSession();
      mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });

      const instrumentSelect = screen.getByLabelText(/instrument/i);
      await user.selectOptions(instrumentSelect, 'Guitar');

      const startButton = screen.getByRole('button', { name: /start session/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
      });
    });

    it('shows correct UI text when paused', async () => {
      const mockSession = {
        session_id: 1,
        instrument: 'Guitar',
        description: '',
        started_at: new Date().toISOString(),
        is_paused: true,
        in_progress: true,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: { active: true, session: mockSession }
      });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByText('Paused')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
      });
    });
  });
});
