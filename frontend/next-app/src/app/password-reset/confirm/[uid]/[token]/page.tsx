"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Key } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const passwordResetConfirmPath = "/api/django/dj-rest-auth/password/reset/confirm/";

function extractErrorMessage(body: unknown) {
  if (body && typeof body === "object") {
    const firstValue = Object.values(body)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }
  return "Could not reset your password. Request a fresh link and try again.";
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function PasswordResetConfirmPage() {
  const params = useParams<{ uid?: string | string[]; token?: string | string[] }>();
  const router = useRouter();
  const uid = decodeURIComponent(paramValue(params.uid));
  const token = decodeURIComponent(paramValue(params.token));
  const [passwords, setPasswords] = useState({ new_password1: "", new_password2: "" });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("saving");
    setError("");

    try {
      const response = await fetch(passwordResetConfirmPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          uid,
          token,
          new_password1: passwords.new_password1,
          new_password2: passwords.new_password2,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(body));
      }

      setState("saved");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : extractErrorMessage(null));
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-7 shadow-sm">
        <div className="w-fit rounded-full bg-primary/10 p-3 text-primary">
          <Key size={22} weight="regular" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use a password you haven&apos;t used here before.
        </p>

        {state === "saved" ? (
          <div role="status" className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4">
            <p className="text-sm font-medium text-foreground">Password updated</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can log in with your new password now.
            </p>
            <Button onClick={() => router.push("/login")} className="mt-4 w-full">
              Go to login
              <ArrowRight size={14} weight="bold" className="ml-1.5" />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {state === "error" && (
              <div className="rounded-lg bg-destructive/[0.06] px-3.5 py-2.5 text-sm font-medium text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new_password1" className="text-xs font-medium text-muted-foreground">
                New password
              </Label>
              <Input
                id="new_password1"
                name="new_password1"
                type="password"
                value={passwords.new_password1}
                onChange={handleChange}
                required
                disabled={state === "saving"}
                className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new_password2" className="text-xs font-medium text-muted-foreground">
                Confirm password
              </Label>
              <Input
                id="new_password2"
                name="new_password2"
                type="password"
                value={passwords.new_password2}
                onChange={handleChange}
                required
                disabled={state === "saving"}
                className="h-10 rounded-lg border-border/60 bg-background px-3 shadow-none transition-colors duration-200 focus:border-primary/50 focus:bg-white"
              />
            </div>

            <Button type="submit" disabled={state === "saving"} className="w-full">
              {state === "saving" ? "Saving..." : "Save new password"}
            </Button>
          </form>
        )}

        {state !== "saved" && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Link expired?{" "}
            <Link href="/password-reset" className="text-primary hover:underline">
              Request a fresh one
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
