"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Guitar, Clock, Sparkle } from "@phosphor-icons/react";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";

interface FormErrors {
  username?: string;
  email?: string;
  password1?: string;
  password2?: string;
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const router = useRouter();

  const validate = () => {
    const tempErrors: FormErrors = {};
    tempErrors.username = formData.username ? "" : "Username is required.";
    tempErrors.email = formData.email.match(
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    )
      ? ""
      : "Email is not valid.";
    tempErrors.password1 =
      formData.password1.length > 5
        ? ""
        : "Password must be at least 6 characters.";
    tempErrors.password2 =
      formData.password1 === formData.password2
        ? ""
        : "Passwords do not match.";

    setErrors(tempErrors);
    return Object.values(tempErrors).every((x) => x === "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const apiUrl = `${apiBaseUrl}/dj-rest-auth/registration/`;

      try {
        const response = await axios.post(apiUrl, formData);
        console.log(response.data);
        router.push("/login");
      } catch (error) {
        console.error("Registration error", error);
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<Record<string, string>>;
          if (axiosError.response?.data) {
            setErrors(axiosError.response.data);
          }
        }
      }
    }
  };

  const features = [
    {
      icon: Guitar,
      title: "Per-instrument memory",
      desc: "Each instrument keeps its own song, BPM, notes, and media source.",
      color: "text-primary",
      bg: "bg-primary/[0.08]",
    },
    {
      icon: Clock,
      title: "Session history",
      desc: "Track streaks, hours, and progress over time with charts and heatmaps.",
      color: "text-warm",
      bg: "bg-warm/[0.08]",
    },
    {
      icon: Sparkle,
      title: "AI recommendations",
      desc: "Get practice plans tailored to your instrument and skill level.",
      color: "text-success",
      bg: "bg-success/[0.08]",
    },
  ];

  const inputClass =
    "h-12 rounded-xl border border-border/60 bg-muted/50 px-4 shadow-none transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-primary/40 focus:bg-card";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div className="container relative mx-auto flex min-h-[100dvh] items-center px-4 py-24 md:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Left — Marketing panel */}
          <MotionDiv
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="hidden flex-col justify-center xl:flex"
          >
            <div className="inline-flex w-fit items-center rounded-full bg-primary/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              New to The Shed
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tighter leading-[0.95] text-foreground md:text-6xl">
              Your setup stays ready.{" "}
              <span className="text-muted-foreground">
                Just sit down and play.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
              Create an account so your instruments, sessions, and progress
              persist across every visit.
            </p>

            <StaggerReveal className="mt-12 space-y-3">
              {features.map((f) => (
                <StaggerItem key={f.title}>
                  <div className="rounded-2xl bg-black/[0.03] p-1 ring-1 ring-black/[0.04] dark:bg-white/[0.03] dark:ring-white/[0.06]">
                    <div className="flex items-start gap-4 rounded-[calc(1rem-0.25rem)] bg-card p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                      <div className={`flex-shrink-0 rounded-xl ${f.bg} p-2.5`}>
                        <f.icon
                          size={18}
                          weight="regular"
                          className={f.color}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {f.title}
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerReveal>
          </MotionDiv>

          {/* Right — Register form (double-bezel card) */}
          <MotionDiv
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.32, 0.72, 0, 1],
              delay: 0.12,
            }}
            className="flex items-center xl:justify-end"
          >
            <div className="w-full max-w-md rounded-[2rem] bg-black/[0.03] p-1.5 ring-1 ring-black/[0.04] dark:bg-white/[0.04] dark:ring-white/[0.08]">
              <div className="rounded-[calc(2rem-0.375rem)] bg-card p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
                <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  New Account
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  Join The Shed
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Create an account so your sessions, setup, and history persist.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Username
                    </Label>
                    <Input
                      className={inputClass}
                      id="username"
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="your_username"
                      required
                    />
                    {errors.username && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Email
                    </Label>
                    <Input
                      className={inputClass}
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                    />
                    {errors.email && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password1"
                      className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Password
                    </Label>
                    <Input
                      className={inputClass}
                      id="password1"
                      type="password"
                      name="password1"
                      value={formData.password1}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    {errors.password1 && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.password1}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password2"
                      className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Confirm Password
                    </Label>
                    <Input
                      className={inputClass}
                      id="password2"
                      type="password"
                      name="password2"
                      value={formData.password2}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    {errors.password2 && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.password2}
                      </p>
                    )}
                  </div>

                  <Button type="submit" size="lg" className="group w-full">
                    <span>Create Account</span>
                    <span className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                      <ArrowRight size={14} weight="bold" />
                    </span>
                  </Button>
                </form>

                <p className="mt-6 text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-foreground hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
