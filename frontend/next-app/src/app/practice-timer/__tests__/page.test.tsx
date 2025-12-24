import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('PracticeTimerPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Render', () => {
    it('renders the practice timer page with initial state', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });

      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByText('Practice Timer')).toBeInTheDocument();
        expect(screen.getByText('Start New Session')).toBeInTheDocument();
        expect(screen.getByText('00:00:00')).toBeInTheDocument();
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });
    });

    it('checks for active timer on mount', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });

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
        expect(screen.getByText('Session in Progress')).toBeInTheDocument();
        // Form is hidden when session is running, so check for pause/stop buttons instead
        expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /stop & save/i })).toBeInTheDocument();
      });
    });
  });

  describe('Start Timer', () => {
    it('starts a new timer with instrument', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          session_id: 1,
          instrument: 'Piano',
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

      const instrumentInput = screen.getByLabelText(/instrument/i);
      await user.type(instrumentInput, 'Piano');

      const startButton = screen.getByRole('button', { name: /start practice/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:8000/api/v1/timer/start/',
          { instrument: 'Piano', description: '' },
          expect.objectContaining({
            headers: { 'Authorization': 'Token test-token' }
          })
        );
      });
    });

    it('displays error when starting without instrument', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
      });

      // Try to start without entering an instrument
      const startButton = screen.getByRole('button', { name: /start practice/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter an instrument/i)).toBeInTheDocument();
      });

      // Verify API was not called
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('increments timer after starting', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });
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

      const instrumentInput = screen.getByLabelText(/instrument/i);
      await user.type(instrumentInput, 'Drums');

      const startButton = screen.getByRole('button', { name: /start practice/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Session in Progress')).toBeInTheDocument();
      });

      // Fast-forward 3 seconds and let React process the update
      jest.advanceTimersByTime(3000);

      // Use waitFor to allow time for React to update
      await waitFor(() => {
        const timerDisplay = screen.getByText(/00:00:0[3-9]/);
        expect(timerDisplay).toBeInTheDocument();
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
        expect(screen.getByText('Session Paused')).toBeInTheDocument();
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
        expect(screen.getByText('Session in Progress')).toBeInTheDocument();
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
        expect(screen.getByText('Session Paused')).toBeInTheDocument();
      });

      // Fast-forward another 5 seconds while paused
      jest.advanceTimersByTime(5000);

      // Timer should not have advanced
      await waitFor(() => {
        const currentTime = screen.getByText(/00:00:0[2-3]/);
        expect(currentTime).toBeInTheDocument();
      });
    });
  });

  describe('Stop Timer', () => {
    it('stops timer and redirects to profile page', async () => {
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
        expect(mockPush).toHaveBeenCalledWith('/profilepage');
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
        expect(screen.getByText(/01:01:0[5-9]/)).toBeInTheDocument();
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
      mockedAxios.get.mockResolvedValueOnce({ data: { active: false } });
      mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      const user = userEvent.setup({ delay: null });
      render(<PracticeTimerPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/instrument/i)).toBeInTheDocument();
      });

      const instrumentInput = screen.getByLabelText(/instrument/i);
      await user.type(instrumentInput, 'Piano');

      const startButton = screen.getByRole('button', { name: /start practice/i });
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
        expect(screen.getByText('Session Paused')).toBeInTheDocument();
        expect(screen.getByText(/your session is paused/i)).toBeInTheDocument();
        expect(screen.getByText(/⏸ paused/i)).toBeInTheDocument();
      });
    });
  });
});
