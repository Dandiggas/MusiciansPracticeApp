"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { useReducedMotion } from "framer-motion";
import { MotionDiv } from "@/components/ui/motion-wrapper";

const resendEmailPath = "/api/django/dj-rest-auth/registration/resend-email/";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [manualResendState, setManualResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const autoResendFiredRef = useRef(false);
  const router = useRouter();
  const reduce = useReducedMotion();

  useEffect(() => {
    void fetch("/api/django/sessions", { method: "GET" }).then((response) => {
      if (response.ok) {
        router.replace("/sessions");
      }
    });
  }, [router]);

  useEffect(() => {
    if (!unverifiedEmail || autoResendFiredRef.current) return;
    autoResendFiredRef.current = true;
    void (async () => {
      try {
        await fetch(resendEmailPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ email: unverifiedEmail }),
        });
      } catch {
        // Silent failure on auto-fire; manual resend button remains.
      }
    })();
  }, [unverifiedEmail]);

  const handleManualResend = async () => {
    if (!unverifiedEmail) return;
    setManualResendState("sending");
    try {
      const response = await fetch(resendEmailPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      if (!response.ok) {
        throw new Error("Unable to resend verification email.");
      }
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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (
          response.status === 400 &&
          Array.isArray(data?.non_field_errors) &&
          data.non_field_errors.some(
            (message: unknown) =>
              typeof message === "string" &&
              message.toLowerCase().includes("not verified")
          )
        ) {
          const email = formData.username.trim();
          setUnverifiedEmail(email.includes("@") ? email : null);
          setManualResendState("idle");
          setError("");
          return;
        }

        const detail =
          typeof data?.detail === "string"
            ? data.detail
            : "Invalid username or password. Please try again.";
        throw new Error(detail);
      }

      router.push("/sessions");
    } catch (err) {
      console.error("Login error", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] bg-background">
      {/* Split-screen: the room owns the left edge (xl+) */}
      <div className="absolute inset-y-0 left-0 hidden w-[42vw] overflow-hidden xl:block">
        {reduce ? (
          <Image
            src="/landing/login-room-poster.jpg"
            alt=""
            fill
            aria-hidden="true"
            className="object-cover"
          />
        ) : (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/landing/login-room-poster.jpg"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src="/landing/login-room.mp4" type="video/mp4" />
          </video>
        )}
        {/* Seam + scrim: blend the footage into the page dark, keep the caption legible */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent"
        />
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="absolute bottom-10 left-10 max-w-sm pr-8"
        >
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-warm">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-warm motion-safe:animate-pulse"
            />
            Live from the shed
          </p>
          <h1 className="mt-3 text-5xl font-black leading-[0.98] tracking-tighter text-foreground">
            Pick up where you left off.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#cfc7bc]">
            Somewhere, someone is putting the hours in.
          </p>
        </MotionDiv>
      </div>

      <div className="relative flex min-h-[100dvh] items-center px-4 py-16 md:px-8 xl:ml-[42vw]">
        <div className="mx-auto w-full max-w-md">

          {/* Login form */}
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.08 }}
            className="flex items-center"
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
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                      Password
                    </Label>
                    <Link
                      href="/password-reset"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      className="h-10 rounded-lg border-border/60 bg-background px-3 pr-11 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeSlash size={18} weight="regular" />
                      ) : (
                        <Eye size={18} weight="regular" />
                      )}
                    </button>
                  </div>
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

          {/* Welcome copy (the headline lives on the film at xl) */}
          <div className="mt-10 xl:hidden">
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
            <h1 className="mt-4 text-4xl font-black leading-[0.98] tracking-tighter text-foreground">
              Pick up where you left off.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              The bench is how you left it: tracks, tempos, loops, and takes
              still in place.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
