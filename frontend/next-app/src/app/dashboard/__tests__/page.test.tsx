import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import DashboardPage from '../page';

jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: jest.fn(),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockStats = {
  total_hours: 12.5,
  total_sessions: 25,
  week_hours: 3.2,
  current_streak: 5,
  favorite_instrument: 'Guitar',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('shows loading skeleton initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    render(<DashboardPage />);
    // Should show skeleton elements (animate-pulse)
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders dashboard with stats', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockStats });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('12.5')).toBeInTheDocument();
      expect(screen.getByText('3.2h')).toBeInTheDocument();
      expect(screen.getByText('5 days')).toBeInTheDocument();
      expect(screen.getByText('Guitar')).toBeInTheDocument();
    });
  });

  it('shows welcome banner for new users with no sessions', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { ...mockStats, total_sessions: 0, total_hours: 0, week_hours: 0, current_streak: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/welcome to your practice journey/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start your first session/i })).toBeInTheDocument();
    });
  });

  it('shows streak banner when streak is active', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockStats });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/5 day streak/i)).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load stats/i)).toBeInTheDocument();
    });
  });

  it('renders quick action cards', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockStats });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Start Practice Session')).toBeInTheDocument();
      expect(screen.getByText('View All Sessions')).toBeInTheDocument();
      expect(screen.getByText('Practice Recommendations')).toBeInTheDocument();
    });
  });
});
