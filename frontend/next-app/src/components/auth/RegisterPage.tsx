"use client";

import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FormErrors {
  username?: string;
  email?: string;
  password1?: string;
  password2?: string;
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password1: '',
    password2: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [registered, setRegistered] = useState(false);
  const router = useRouter();

  const validate = () => {
    const tempErrors: FormErrors = {};
    tempErrors.username = formData.username ? "" : "Username is required.";
    tempErrors.email = formData.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i) ? "" : "Email is not valid.";
    tempErrors.password1 = formData.password1.length > 5 ? "" : "Password must be at least 6 characters.";
    tempErrors.password2 = formData.password1 === formData.password2 ? "" : "Passwords do not match.";

    setErrors(tempErrors);
    return Object.values(tempErrors).every(x => x === "");
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const apiUrl = `${apiBaseUrl}/dj-rest-auth/registration/`;

      try {
        await axios.post(apiUrl, formData);
        setRegistered(true);
      } catch (error) {
        console.error('Registration error', error);
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<Record<string, string>>;
          if (axiosError.response?.data) {
            setErrors(axiosError.response.data);
          }
        }
      }
    }
  }

  if (registered) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm bg-card text-card-foreground rounded-xl border border-border">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">
              We&apos;ve sent a confirmation link to <strong>{formData.email}</strong>. Click the link to verify your account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t get the email? Check your spam folder or{" "}
              <button
                onClick={() => setRegistered(false)}
                className="text-primary hover:underline"
              >
                try again
              </button>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm bg-card text-card-foreground rounded-xl border border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Join The Shed</CardTitle>
          <CardDescription className="text-muted-foreground">
            Create a new account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="username">Username</Label>
              <Input
                className="bg-secondary border border-border rounded-lg"
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="your_username"
                required
              />
              {errors.username && (
                <div className="text-sm font-medium text-destructive">
                  {errors.username}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="email">Email</Label>
              <Input
                className="bg-secondary border border-border rounded-lg"
                id="email"
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
              {errors.email && (
                <div className="text-sm font-medium text-destructive">
                  {errors.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="password1">Password</Label>
              <Input
                className="bg-secondary border border-border rounded-lg"
                id="password1"
                type="password"
                name="password1"
                value={formData.password1}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {errors.password1 && (
                <div className="text-sm font-medium text-destructive">
                  {errors.password1}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="password2">Confirm Password</Label>
              <Input
                className="bg-secondary border border-border rounded-lg"
                id="password2"
                type="password"
                name="password2"
                value={formData.password2}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              {errors.password2 && (
                <div className="text-sm font-medium text-destructive">
                  {errors.password2}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground rounded-lg">
              Register
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
