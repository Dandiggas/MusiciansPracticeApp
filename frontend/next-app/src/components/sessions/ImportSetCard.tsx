"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardText, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  importSetList,
  previewSetListImport,
  SetListPreviewItem,
} from "@/lib/api";

function nextSundayName() {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
  return `Sunday ${sunday.getDate()} ${sunday.toLocaleString("en-GB", { month: "short" })}`;
}

interface EditableItem extends SetListPreviewItem {
  useMatch: boolean;
}

export function ImportSetCard() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [items, setItems] = useState<EditableItem[] | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePreview() {
    if (!text.trim()) {
      setError("Paste the set list first.");
      return;
    }
    setIsBusy(true);
    setError("");
    try {
      const { items: previewItems } = await previewSetListImport(text);
      setItems(previewItems.map((item) => ({ ...item, useMatch: item.match !== null })));
      setSessionName(nextSundayName());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that set list.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreate() {
    if (!items || items.length === 0) return;
    const name = sessionName.trim();
    if (!name) {
      setError("Give the session a name.");
      return;
    }
    setIsBusy(true);
    setError("");
    try {
      const session = await importSetList(
        name,
        items.map((item) => ({
          title: item.title,
          key: item.key ?? "",
          source_track_id: item.useMatch && item.match ? item.match.track_id : null,
        }))
      );
      router.push(`/sessions/${session.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the session."
      );
      setIsBusy(false);
    }
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((current) =>
      current
        ? current.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : current
    );
  }

  function removeItem(index: number) {
    setItems((current) =>
      current ? current.filter((_, i) => i !== index) : current
    );
  }

  function reset() {
    setItems(null);
    setError("");
  }

  if (!expanded) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setExpanded(true)}
        className="gap-2"
      >
        <ClipboardText size={16} aria-hidden />
        Paste this week&apos;s set list
      </Button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Paste this week&apos;s set list
          </p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Straight from WhatsApp or email — songs and keys. Anything
            you&apos;ve practised before carries its setup forward.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close set list import"
          onClick={() => {
            setExpanded(false);
            reset();
          }}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {items === null ? (
        <>
          <Textarea
            aria-label="Set list text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"1. Way Maker – Bb\n2. Goodness of God – A\n3. Same God – C#m"}
            disabled={isBusy}
            className="mt-4 min-h-32 resize-y font-mono text-sm"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button type="button" onClick={() => void handlePreview()} disabled={isBusy}>
              {isBusy ? "Reading..." : "Preview"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60">
            {items.map((item, index) => (
              <li key={`${item.line}-${index}`} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <Input
                  aria-label={`Song ${index + 1} title`}
                  value={item.title}
                  onChange={(event) => updateItem(index, { title: event.target.value })}
                  className="h-9 min-w-40 flex-1"
                />
                <Input
                  aria-label={`Song ${index + 1} key`}
                  value={item.key ?? ""}
                  onChange={(event) => updateItem(index, { key: event.target.value })}
                  placeholder="Key"
                  className="h-9 w-20"
                />
                {item.match ? (
                  <button
                    type="button"
                    onClick={() => updateItem(index, { useMatch: !item.useMatch })}
                    title={
                      item.useMatch
                        ? `Carries over your setup from “${item.match.session_name}” — click to start fresh instead`
                        : "Click to carry over your previous setup"
                    }
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      item.useMatch
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground line-through"
                    }`}
                  >
                    from “{item.match.session_name}”
                  </button>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    new
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${item.title || "song"}`}
                  onClick={() => removeItem(index)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <label
                htmlFor="import-session-name"
                className="text-sm font-medium text-foreground"
              >
                Session name
              </label>
              <Input
                id="import-session-name"
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                disabled={isBusy}
                className="mt-2"
              />
            </div>
            <Button type="button" onClick={() => void handleCreate()} disabled={isBusy}>
              {isBusy ? "Creating..." : `Create session (${items.length} songs)`}
            </Button>
            <Button type="button" variant="outline" onClick={reset} disabled={isBusy}>
              Back
            </Button>
          </div>
        </>
      )}

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
