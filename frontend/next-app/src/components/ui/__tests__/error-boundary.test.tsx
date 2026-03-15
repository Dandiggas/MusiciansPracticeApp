import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../error-boundary';

let shouldThrow = false;

function ThrowError() {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });
  beforeEach(() => {
    shouldThrow = false;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI on error', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders custom fallback on error', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error')).toBeInTheDocument();
  });

  it('recovers after clicking try again', async () => {
    shouldThrow = true;
    const user = userEvent.setup({ delay: null });
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Stop throwing before clicking try again
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
