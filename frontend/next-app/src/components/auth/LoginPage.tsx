"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [manualResendState, setManualResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const autoResendFiredRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!unverifiedEmail || autoResendFiredRef.current) return;
    autoResendFiredRef.current = true;
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    void (async () => {
      try {
        await axios.post(`${apiBaseUrl}/dj-rest-auth/registration/resend-email/`, {
          email: unverifiedEmail,
        });
      } catch {
        // Silent failure on auto-fire — manual resend button remains.
      }
    })();
  }, [unverifiedEmail]);

  const handleManualResend = async () => {
    if (!unverifiedEmail) return;
    setManualResendState("sending");
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    try {
      await axios.post(
        `${apiBaseUrl}/dj-rest-auth/registration/resend-email/`,
        { email: unverifiedEmail }
      );
      setManualResendState("sent");
    } catch {
      setManualResendState("error");
    }
  };

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
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 400 &&
        Array.isArray(err.response?.data?.non_field_errors) &&
        err.response.data.non_field_errors.some((m: string) =>
          m.toLowerCase().includes("not verified")
        )
      ) {
        // Use the typed username as the resend target. If the user logged in
        // with a plain username (not an email), the resend call may be
        // rejected server-side — that's caught silently. Users who typed an
        // email-as-username get the happy auto-resend path; users with a
        // separate username/email can still use the manual resend button or
        // visit /auth/check-email directly.
        setUnverifiedEmail(formData.username);
        setError("");
        return;
      }
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
      bg: "bg-primary/[0.1] dark:bg-primary/[0.15]",
    },
    {
      icon: Clock,
      title: "Build consistency",
      desc: "Short sessions still matter when the setup is ready the moment you sit down.",
      color: "text-warm",
      bg: "bg-warm/[0.1] dark:bg-warm/[0.15]",
    },
    {
      icon: Sparkle,
      title: "Plan when you need it",
      desc: "Recommendations stay available without getting in the way of practice.",
      color: "text-success",
      bg: "bg-success/[0.1] dark:bg-success/[0.15]",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="container mx-auto flex min-h-[100dvh] items-center px-4 py-16 md:px-8">
        <div className="mx-auto grid w-full max-w-5xl gap-12 xl:grid-cols-[1.1fr_0.9fr]">

          {/* Left — Marketing (order-2 on mobile so form shows first) */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="order-2 flex flex-col justify-center xl:order-1"
          >
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight leading-snug text-foreground md:text-[42px]">
              Practice makes permanent.{" "}
              <span className="text-muted-foreground">Intentional practice makes progress.</span>
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Log in, reopen your last session, and get back to focused work
              without rebuilding your setup from scratch.
            </p>

            <StaggerReveal className="mt-10 space-y-2">
              {features.map((f) => (
                <StaggerItem key={f.title}>
                  <div className="flex items-start gap-3.5 rounded-lg p-3 transition-colors duration-200 hover:bg-muted/60">
                    <div className={`flex-shrink-0 rounded-lg ${f.bg} p-2`}>
                      <f.icon size={16} weight="regular" className={f.color} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </MotionDiv>

          {/* Right — Login form (order-1 on mobile) */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.08 }}
            className="order-1 flex items-center xl:order-2"
          >
            <div className="w-full rounded-xl border border-border/60 bg-card p-7 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Log In
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                Return to The Shed
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Your session history, last setup, and practice recommendations
                live behind your account.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {unverifiedEmail && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-lg border border-warm/40 bg-warm/10 p-3 text-sm"
                  >
                    <p className="font-medium text-foreground">
                      Your email isn&apos;t verified yet
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      We sent you a fresh link to{" "}
                      <strong className="text-foreground">{unverifiedEmail}</strong>.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleManualResend}
                      disabled={manualResendState === "sending"}
                      className="mt-2 h-9 rounded-lg"
                    >
                      {manualResendState === "sending"
                        ? "Sending..."
                        : manualResendState === "sent"
                          ? "Sent!"
                          : "Resend"}
                    </Button>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-destructive/[0.06] px-3.5 py-2.5 text-sm font-medium text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
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
                    className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
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
                    className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Logging in..." : "Open The Shed"}
                  {!isLoading && <ArrowRight size={14} weight="bold" className="ml-1.5" />}
                </Button>
              </form>

              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-foreground">New here?</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Create an account so your sessions, setup, and history persist.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-3 w-full"
                >
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
