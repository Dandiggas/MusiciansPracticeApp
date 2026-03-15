import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import LoginPage from '../LoginPage';

jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn(),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows link to register page', () => {
    render(<LoginPage />);
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });

  it('shows link to forgot password', () => {
    render(<LoginPage />);
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });

  it('submits form and redirects on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { key: 'test-token', user: 1 },
    });

    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/dj-rest-auth/login/'),
        { username: 'testuser', password: 'password123' }
      );
      expect(mockPush).toHaveBeenCalledWith('/profilepage');
    });
  });

  it('shows error on failed login', async () => {
    const axiosError = {
      response: { data: { detail: 'Unable to log in with provided credentials.' } },
      isAxiosError: true,
    };
    mockedAxios.post.mockRejectedValueOnce(axiosError);
    (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'wrong');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to log in/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while submitting', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup({ delay: null });
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/logging in/i)).toBeInTheDocument();
    });
  });
});
