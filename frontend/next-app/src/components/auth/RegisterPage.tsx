"use client";

import React, { useState } from 'react';
import Link from 'next/link';
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
import { ArrowRight } from "@phosphor-icons/react";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";

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
        const response = await axios.post(apiUrl, formData);
        console.log(response.data);
        router.push('/login');
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

  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-background">
      <MotionDiv
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.smooth}
        className="w-full max-w-sm"
      >
        <Card className="rounded-[1.25rem] border border-border/50 bg-card shadow-[0_20px_40px_-15px_rgba(28,25,23,0.05)] dark:bg-card/70 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-card-foreground">
          <CardHeader className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              New Account
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              Join The Shed
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Create an account so your sessions, setup, and history persist across every visit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaggerReveal>
              <form onSubmit={handleSubmit} className="space-y-4">
                <StaggerItem>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="username">Username</Label>
                    <Input
                      className="h-12 bg-secondary border border-border rounded-lg px-4 shadow-none"
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
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="email">Email</Label>
                    <Input
                      className="h-12 bg-secondary border border-border rounded-lg px-4 shadow-none"
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
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="password1">Password</Label>
                    <Input
                      className="h-12 bg-secondary border border-border rounded-lg px-4 shadow-none"
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
                </StaggerItem>

                <StaggerItem>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground" htmlFor="password2">Confirm Password</Label>
                    <Input
                      className="h-12 bg-secondary border border-border rounded-lg px-4 shadow-none"
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
                </StaggerItem>

                <StaggerItem>
                  <Button
                    type="submit"
                    className="h-12 w-full bg-primary text-base text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    Create Account
                    <ArrowRight size={20} weight="regular" className="ml-2" />
                  </Button>
                </StaggerItem>

                <StaggerItem>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-foreground font-semibold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </StaggerItem>
              </form>
            </StaggerReveal>
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  );
};

export default RegisterPage;
