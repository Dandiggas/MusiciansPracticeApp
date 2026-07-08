"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Clock, Eye, EyeSlash, Guitar, Sparkle } from "@phosphor-icons/react";
import { StaggerReveal, StaggerItem, MotionDiv } from "@/components/ui/motion-wrapper";

interface FormErrors {
  username?: string;
  email?: string;
  password1?: string;
  password2?: string;
  non_field_errors?: string;
  detail?: string;
}

function normalizeErrorValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return typeof value === "string" ? value : undefined;
}

function isDuplicateAccountError(message?: string) {
  return Boolean(message?.match(/already|registered|exists|in use/i));
}

function ExistingAccountHelp() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      <Link
        href="/login"
        className="font-semibold text-foreground hover:underline"
      >
        Sign in
      </Link>
      <Link
        href="/password-reset"
        className="font-semibold text-foreground hover:underline"
      >
        Reset password
      </Link>
    </div>
  );
}

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
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
      setIsSubmitting(true);
      setErrors({});
      try {
        const response = await fetch("/api/django/dj-rest-auth/registration/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const nextErrors: FormErrors = {
            username: normalizeErrorValue(data?.username),
            email: normalizeErrorValue(data?.email),
            password1: normalizeErrorValue(data?.password1),
            password2: normalizeErrorValue(data?.password2),
            non_field_errors: normalizeErrorValue(data?.non_field_errors),
          };
          const hasFieldErrors = Boolean(
            nextErrors.username ||
              nextErrors.email ||
              nextErrors.password1 ||
              nextErrors.password2
          );

          setErrors({
            ...nextErrors,
            detail: hasFieldErrors
              ? undefined
              : normalizeErrorValue(data?.detail) ||
                "We couldn't create your account. Please check the form and try again.",
          });
          return;
        }

        router.push(`/auth/check-email?email=${encodeURIComponent(formData.email)}`);
      } catch (error) {
        console.error("Registration error", error);
        setErrors({
          detail: "We couldn't reach the server. Please try again in a moment.",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const features = [
    {
      icon: Guitar,
      title: "Per-instrument memory",
      desc: "Each instrument keeps its own song, BPM, notes, and media source.",
      color: "text-primary",
      bg: "bg-primary/[0.1] dark:bg-primary/[0.15]",
    },
    {
      icon: Clock,
      title: "Session history",
      desc: "Track streaks, hours, and progress over time with charts and heatmaps.",
      color: "text-primary",
      bg: "bg-primary/[0.1] dark:bg-primary/[0.15]",
    },
    {
      icon: Sparkle,
      title: "AI recommendations",
      desc: "Get practice plans tailored to your instrument and skill level.",
      color: "text-primary",
      bg: "bg-primary/[0.1] dark:bg-primary/[0.15]",
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

            <h1 className="mt-6 text-4xl font-black tracking-tighter leading-[0.95] text-foreground md:text-6xl">
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
                  {(errors.detail || errors.non_field_errors) && (
                    <div className="rounded-lg bg-destructive/[0.06] px-3.5 py-2.5 text-sm font-medium text-destructive">
                      {errors.non_field_errors || errors.detail}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-foreground"
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
                      disabled={isSubmitting}
                    />
                    {errors.username && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">
                          {isDuplicateAccountError(errors.username)
                            ? "Looks like this username is already taken."
                            : errors.username}
                        </p>
                        {isDuplicateAccountError(errors.username) && (
                          <ExistingAccountHelp />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-foreground"
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
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-destructive">
                          {isDuplicateAccountError(errors.email)
                            ? "Looks like this email already has an account."
                            : errors.email}
                        </p>
                        {isDuplicateAccountError(errors.email) && (
                          <ExistingAccountHelp />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password1"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        className={`${inputClass} pr-12`}
                        id="password1"
                        type={showPassword1 ? "text" : "password"}
                        name="password1"
                        value={formData.password1}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        aria-label={showPassword1 ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword1((current) => !current)}
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                      >
                        {showPassword1 ? (
                          <EyeSlash size={18} weight="regular" />
                        ) : (
                          <Eye size={18} weight="regular" />
                        )}
                      </button>
                    </div>
                    {errors.password1 && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.password1}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password2"
                      className="text-sm font-medium text-foreground"
                    >
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        className={`${inputClass} pr-12`}
                        id="password2"
                        type={showPassword2 ? "text" : "password"}
                        name="password2"
                        value={formData.password2}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        aria-label={showPassword2 ? "Hide confirm password" : "Show confirm password"}
                        onClick={() => setShowPassword2((current) => !current)}
                        disabled={isSubmitting}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                      >
                        {showPassword2 ? (
                          <EyeSlash size={18} weight="regular" />
                        ) : (
                          <Eye size={18} weight="regular" />
                        )}
                      </button>
                    </div>
                    {errors.password2 && (
                      <p className="text-sm font-medium text-destructive">
                        {errors.password2}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="group w-full"
                    disabled={isSubmitting}
                  >
                    <span>{isSubmitting ? "Creating..." : "Create Account"}</span>
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
