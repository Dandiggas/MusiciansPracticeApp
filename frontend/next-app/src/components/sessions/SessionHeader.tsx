"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteSession, renameSession } from "@/lib/api";
import { SessionDetail } from "@/types/session";


interface SessionHeaderProps {
  session: SessionDetail;
  mutateSession: (updater: (current: SessionDetail) => SessionDetail) => void;
  onDeleted: () => void;
}

export function SessionHeader({
  session,
  mutateSession,
  onDeleted,
}: SessionHeaderProps) {
  const [name, setName] = useState(session.name);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setName(session.name);
  }, [session.name]);

  const canSave = name.trim().length > 0 && name.trim() !== session.name;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const updated = await renameSession(session.id, name.trim());
      mutateSession((current) => ({
        ...current,
        name: updated.name,
        updated_at: updated.updated_at,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename session.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${session.name}" and all its tracks?`)) {
      return;
    }

    setIsDeleting(true);
    setError("");
    try {
      await deleteSession(session.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete session.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Session
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 text-xl font-bold"
            />
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Keep the tracks, BPM, last-used speeds, and saved licks together in
            one long-lived practice space.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 lg:items-end">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Updated {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }).format(new Date(session.updated_at))}
          </p>
          <Button
            type="button"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Session"}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
