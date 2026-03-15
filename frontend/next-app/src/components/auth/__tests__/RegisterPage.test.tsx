import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import RegisterPage from '../RegisterPage';

jest.mock('axios', () => ({
  post: jest.fn(),
  isAxiosError: jest.fn(),
}));
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders registration form', () => {
    render(<RegisterPage />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('shows link to login page', () => {
    render(<RegisterPage />);
    expect(screen.getByText(/log in/i)).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'invalidemail');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is not valid/i)).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('validates password match', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@email.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('validates password length', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@email.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('submits form and redirects on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { key: 'token' } });

    const user = userEvent.setup({ delay: null });
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@email.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/dj-rest-auth/registration/'),
        expect.objectContaining({
          username: 'testuser',
          email: 'test@email.com',
          password1: 'password123',
          password2: 'password123',
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
