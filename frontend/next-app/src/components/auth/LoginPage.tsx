"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
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
import { ArrowRight, Clock, MusicNote, Sparkle } from "@phosphor-icons/react";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";
import { springs } from "@/lib/motion";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const apiUrl = `${apiBaseUrl}/dj-rest-auth/login/`;

    try {
      const response = await axios.post(apiUrl, formData);
      localStorage.setItem("token", response.data.key);
      localStorage.setItem("userId", response.data.user);
      router.push("/dashboard");
    } catch (err) {
      console.error("Login error", err);
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<{ detail?: string }>;
        setError(
          axiosError.response?.data?.detail ||
            "Invalid username or password. Please try again."
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="container relative mx-auto flex min-h-[100dvh] items-center px-4 py-10 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.smooth}
            className="rounded-[2rem] border border-border bg-card p-8 text-card-foreground shadow-lg"
          >
            <div className="inline-flex items-center rounded-full border border-border bg-secondary px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Welcome Back
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-foreground md:text-6xl">
              Practice makes permanent. Intentional practice makes progress.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Log in, reopen your last session, and get back to focused work
              without rebuilding your setup from scratch.
            </p>

            <StaggerReveal className="mt-8 space-y-4">
              <StaggerItem>
                <div className="rounded-2xl border border-border bg-secondary p-4">
                  <MusicNote size={20} weight="regular" className="text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Resume your setup
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Jump back into the last instrument, media source, and flow.
                  </p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-2xl border border-border bg-secondary p-4">
                  <Clock size={20} weight="regular" className="text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Build consistency
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Short sessions still matter when the setup is ready the moment you sit down.
                  </p>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-2xl border border-border bg-secondary p-4">
                  <Sparkle size={20} weight="regular" className="text-primary" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Plan when you need it
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Recommendations stay available without getting in the way of practice.
                  </p>
                </div>
              </StaggerItem>
            </StaggerReveal>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.smooth, delay: 0.1 }}
          >
            <Card className="rounded-[1.25rem] border border-border/50 bg-card p-8 shadow-[0_20px_40px_-15px_rgba(28,25,23,0.05)] dark:bg-card/70 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-card-foreground">
              <CardHeader className="space-y-3 p-0 pb-6">
                <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Log In
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                  Return to The Shed
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Your session history, last setup, and practice recommendations
                  live behind your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="your_username"
                      required
                      disabled={isLoading}
                      className="h-12 rounded-lg border border-border bg-secondary px-4 shadow-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      className="h-12 rounded-lg border border-border bg-secondary px-4 shadow-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-lg bg-primary text-base text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading ? "Logging in..." : "Open The Shed"}
                    {!isLoading && <ArrowRight size={20} weight="regular" className="ml-2" />}
                  </Button>
                </form>

                <div className="rounded-xl border border-border bg-secondary p-4">
                  <p className="text-sm font-semibold text-foreground">
                    New here?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create an account so your sessions, setup, and history persist.
                  </p>
                  <Button
                    asChild
                    variant="secondary"
                    className="mt-4 h-11 w-full rounded-lg border border-border bg-card text-foreground shadow-none hover:bg-secondary"
                  >
                    <Link href="/register">Create Account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
