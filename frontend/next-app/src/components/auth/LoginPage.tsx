"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clock, MusicNote, Sparkle } from "@phosphor-icons/react";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";

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

  const features = [
    {
      icon: MusicNote,
      title: "Resume your setup",
      desc: "Jump back into the last instrument, media source, and flow.",
      color: "text-primary",
      bg: "bg-primary/[0.08]",
    },
    {
      icon: Clock,
      title: "Build consistency",
      desc: "Short sessions still matter when the setup is ready the moment you sit down.",
      color: "text-warm",
      bg: "bg-warm/[0.08]",
    },
    {
      icon: Sparkle,
      title: "Plan when you need it",
      desc: "Recommendations stay available without getting in the way of practice.",
      color: "text-success",
      bg: "bg-success/[0.08]",
    },
  ];

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      {/* Subtle radial glow in dark mode */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      <div className="container relative mx-auto flex min-h-[100dvh] items-center px-4 py-24 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-8 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Left — Marketing panel (order-2 on mobile so form shows first) */}
          <MotionDiv
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="order-2 flex flex-col justify-center xl:order-1"
          >
            {/* Eyebrow tag */}
            <div className="inline-flex w-fit items-center rounded-full bg-primary/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Welcome Back
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tighter leading-[0.95] text-foreground md:text-6xl">
              Practice makes permanent.{" "}
              <span className="text-muted-foreground">Intentional practice makes progress.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Log in, reopen your last session, and get back to focused work
              without rebuilding your setup from scratch.
            </p>

            {/* Feature cards — double-bezel style */}
            <StaggerReveal className="mt-12 space-y-3">
              {features.map((f) => (
                <StaggerItem key={f.title}>
                  {/* Outer shell */}
                  <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                    {/* Inner core */}
                    <div className="flex items-start gap-4 rounded-[calc(1rem-0.25rem)] bg-card p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                      <div className={`flex-shrink-0 rounded-xl ${f.bg} p-2.5`}>
                        <f.icon size={18} weight="regular" className={f.color} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{f.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </MotionDiv>

          {/* Right — Login form (order-1 on mobile so it shows first) */}
          <MotionDiv
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: 0.12 }}
            className="order-1 flex items-center xl:order-2"
          >
            {/* Outer shell */}
            <div className="w-full rounded-[2rem] bg-black/[0.03] p-1.5 ring-1 ring-black/[0.04] dark:bg-white/[0.04] dark:ring-white/[0.08]">
              {/* Inner core */}
              <div className="rounded-[calc(2rem-0.375rem)] bg-card p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                {/* Eyebrow */}
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Log In
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  Return to The Shed
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Your session history, last setup, and practice recommendations
                  live behind your account.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  {error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 text-sm font-medium text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
                      className="h-12 rounded-xl border border-border/60 bg-muted/50 px-4 shadow-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-primary/40 focus:bg-card"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
                      className="h-12 rounded-xl border border-border/60 bg-muted/50 px-4 shadow-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-primary/40 focus:bg-card"
                    />
                  </div>

                  {/* Button-in-button CTA */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    size="lg"
                    className="group w-full"
                  >
                    <span>{isLoading ? "Logging in..." : "Open The Shed"}</span>
                    {!isLoading && (
                      <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                        <ArrowRight size={14} weight="bold" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Sign-up CTA — double-bezel nested */}
                <div className="mt-8 rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.03] dark:bg-white/[0.03] dark:ring-white/[0.05]">
                  <div className="rounded-[calc(1rem-0.25rem)] bg-muted/30 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]">
                    <p className="text-sm font-semibold text-foreground">New here?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create an account so your sessions, setup, and history persist.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="default"
                      className="mt-4 w-full"
                    >
                      <Link href="/register">Create Account</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
