"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const passwordResetPath = "/api/django/dj-rest-auth/password/reset/";

function errorMessage(body: unknown) {
  if (body && typeof body === "object") {
    const firstValue = Object.values(body)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }
  return "Could not send a reset link. Try again in a moment.";
}

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("sending");
    setError("");

    try {
      const response = await fetch(passwordResetPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorMessage(body));
      }

      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : errorMessage(null));
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-7 shadow-sm">
        <div className="w-fit rounded-full bg-primary/10 p-3 text-primary">
          <EnvelopeSimple size={22} weight="regular" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Enter your account email and we&apos;ll send you a link to choose a new password.
        </p>

        {state === "sent" ? (
          <div role="status" className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4">
            <p className="text-sm font-medium text-foreground">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on the way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {state === "error" && (
              <div className="rounded-lg bg-destructive/[0.06] px-3.5 py-2.5 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={state === "sending"}
                className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
              />
            </div>

            <Button type="submit" disabled={state === "sending"} className="w-full">
              {state === "sending" ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <Button asChild variant="ghost" className="mt-4 w-full">
          <Link href="/login">
            <ArrowLeft size={14} weight="bold" className="mr-1.5" />
            Back to login
          </Link>
        </Button>
      </div>
    </main>
  );
}
