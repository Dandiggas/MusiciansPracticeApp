"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const key = searchParams.get('key');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!key) {
      setStatus('error');
      setErrorMessage('No verification key found. Please check your email link.');
      return;
    }

    const verifyEmail = async () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      try {
        await axios.post(`${apiBaseUrl}/dj-rest-auth/registration/verify-email/`, { key });
        setStatus('success');
      } catch {
        setStatus('error');
        setErrorMessage('This verification link is invalid or has expired. Please try registering again.');
      }
    };

    verifyEmail();
  }, [key]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm bg-card text-card-foreground rounded-xl border border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">
            {status === 'verifying' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'verifying' && (
            <p className="text-muted-foreground">Please wait while we verify your email address.</p>
          )}
          {status === 'success' && (
            <>
              <p className="text-muted-foreground">
                Your email has been confirmed. You can now sign in to your account.
              </p>
              <Button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground rounded-lg"
              >
                Sign In
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="text-muted-foreground">{errorMessage}</p>
              <Button
                onClick={() => router.push('/register')}
                className="w-full bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground rounded-lg"
              >
                Back to Register
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
