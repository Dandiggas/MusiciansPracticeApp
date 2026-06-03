"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EnvelopeSimple } from "@phosphor-icons/react";

const resendEmailPath = "/api/django/dj-rest-auth/registration/resend-email/";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [isResending, setIsResending] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sent" | "error">("idle");

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setResendState("idle");
    try {
      const response = await fetch(resendEmailPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error("Unable to resend verification email.");
      }
      setResendState("sent");
    } catch {
      setResendState("error");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[1.5rem] bg-card p-8 border border-border">
        <div className="mx-auto w-fit rounded-full bg-primary/10 p-3 text-primary">
          <EnvelopeSimple size={24} weight="regular" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground text-center">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          {email
            ? <>We sent a link to <strong className="text-foreground">{email}</strong>. Click it to finish setting up your account.</>
            : <>We sent you a link to finish setting up your account.</>}
        </p>

        <Button
          onClick={handleResend}
          disabled={isResending || !email}
          className="mt-6 w-full h-11 rounded-lg"
          variant="secondary"
        >
          {isResending ? "Sending..." : "Resend link"}
        </Button>

        {resendState === "sent" && (
          <p className="mt-3 text-sm text-success text-center">Sent! Check your inbox.</p>
        )}
        {resendState === "error" && (
          <p className="mt-3 text-sm text-destructive text-center">
            Couldn&apos;t resend. Try again in a moment.
          </p>
        )}

        <p className="mt-6 text-xs text-muted-foreground text-center">
          Wrong email? <Link href="/register" className="text-primary hover:underline">Register again</Link>
        </p>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <CheckEmailContent />
    </Suspense>
  );
}
