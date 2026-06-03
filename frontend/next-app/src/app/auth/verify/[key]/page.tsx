"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Warning, Clock } from "@phosphor-icons/react";

const resendEmailPath = "/api/django/dj-rest-auth/registration/resend-email/";

type VerifyState =
  | { status: "loading" }
  | { status: "success" }
  | { status: "expired" }
  | { status: "invalid" }
  | { status: "already_verified" }
  | { status: "error" };

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const rawKey =
    typeof params?.key === "string"
      ? params.key
      : Array.isArray(params?.key)
        ? params.key[0]
        : "";
  // Trim whitespace defensively — terminal copy-paste of the activate_url
  // sometimes includes a trailing newline or space which the URL bar silently
  // preserves, and the backend treats whitespace-suffixed keys as invalid (404).
  const key = rawKey.trim();
  const hasRun = useRef(false);
  const [state, setState] = useState<VerifyState>({ status: "loading" });
  const [resendEmail, setResendEmail] = useState("");
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    if (hasRun.current || !key) return;
    hasRun.current = true;

    (async () => {
      try {
        const response = await fetch("/api/auth/verify-and-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ key }),
        });

        if (!response.ok) {
          if (response.status === 410) setState({ status: "expired" });
          else if (response.status === 404) setState({ status: "invalid" });
          else if (response.status === 409) setState({ status: "already_verified" });
          else setState({ status: "error" });
          return;
        }

        setState({ status: "success" });
        router.push("/sessions");
      } catch {
        setState({ status: "error" });
      }
    })();
  }, [key, router]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendState("sending");
    try {
      const response = await fetch(resendEmailPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (!response.ok) {
        throw new Error("Unable to resend verification email.");
      }
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[1.5rem] bg-card p-8 border border-border">
        {state.status === "loading" && (
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto w-fit">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Verifying your email...
            </p>
          </div>
        )}

        {state.status === "success" && (
          <div className="text-center" role="status" aria-live="polite">
            <div className="mx-auto w-fit rounded-full bg-success/10 p-3 text-success">
              <CheckCircle size={24} weight="regular" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Verified. Taking you in...
            </p>
          </div>
        )}

        {(state.status === "expired" || state.status === "invalid") && (
          <>
            <div className="mx-auto w-fit rounded-full bg-warm/10 p-3 text-warm">
              <Clock size={24} weight="regular" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground text-center">
              {state.status === "expired"
                ? "This link has expired"
                : "This link isn't valid"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              {state.status === "expired"
                ? "Verification links expire after 24 hours. Enter your email and we'll send a fresh one."
                : "We couldn't match this link to a pending verification. Enter the email you registered with and we'll send a fresh link."}
            </p>
            <div className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="resend-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-10 rounded-lg"
                />
              </div>
              <Button
                onClick={handleResend}
                disabled={resendState === "sending" || !resendEmail}
                className="w-full h-11 rounded-lg"
              >
                {resendState === "sending" ? "Sending..." : "Send a new link"}
              </Button>
              <div role="status" aria-live="polite">
                {resendState === "sent" && (
                  <p className="text-sm text-success text-center">
                    Sent! Check your inbox.
                  </p>
                )}
                {resendState === "error" && (
                  <p className="text-sm text-destructive text-center">
                    Couldn&apos;t send. Try again in a moment.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {state.status === "already_verified" && (
          <>
            <div className="mx-auto w-fit rounded-full bg-success/10 p-3 text-success">
              <CheckCircle size={24} weight="regular" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground text-center">
              You&apos;re already verified
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              This email is confirmed. Head to the login page to sign in.
            </p>
            <Link href="/login" className="block mt-6">
              <Button className="w-full h-11 rounded-lg">Go to login</Button>
            </Link>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className="mx-auto w-fit rounded-full bg-destructive/10 p-3 text-destructive">
              <Warning size={24} weight="regular" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground text-center">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              We couldn&apos;t reach the server. Try again?
            </p>
            <Button
              onClick={() => {
                hasRun.current = false;
                setState({ status: "loading" });
              }}
              className="w-full h-11 rounded-lg mt-6"
            >
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
