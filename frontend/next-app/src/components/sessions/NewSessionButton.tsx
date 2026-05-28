"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSession } from "@/lib/api";


export function NewSessionButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the session a name first.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const session = await createSession(trimmed);
      setName("");
      router.push(`/sessions/${session.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <label
        htmlFor="new-session-name"
        className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
      >
        New session
      </label>
      <div className="mt-3 flex gap-2">
        <Input
          id="new-session-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Kevin Bond"
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleCreate();
            }
          }}
        />
        <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
