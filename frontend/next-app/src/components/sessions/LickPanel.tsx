"use client";

import { useEffect, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DotsSixVertical, PencilSimple, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLick, deleteLick, reorderLicks, updateLick } from "@/lib/api";
import { Lick, Track } from "@/types/session";


function formatTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatTimestampInput(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  const secondsText = Number.isInteger(remainder)
    ? String(remainder).padStart(2, "0")
    : remainder.toFixed(2).padStart(5, "0").replace(/0+$/, "").replace(/\.$/, "");

  return `${minutes}:${secondsText}`;
}

function parseTimestampInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length !== 2) {
      return Number.NaN;
    }

    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return Number.NaN;
    }

    return minutes * 60 + seconds;
  }

  const seconds = Number(trimmed);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : Number.NaN;
}

function sortLicks(licks: Lick[]) {
  return [...licks].sort((left, right) => left.position - right.position);
}

function SortableLickRow({
  active,
  editing,
  lick,
  onDelete,
  onEdit,
  onSelect,
}: {
  active: boolean;
  editing: boolean;
  lick: Lick;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lick.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
        editing
          ? "border-primary/60 bg-primary/[0.12]"
          : active
          ? "border-primary/40 bg-primary/[0.08]"
          : "border-border/60 bg-card/60"
      }`}
    >
      <button
        type="button"
        className="flex flex-1 items-center justify-between gap-4 text-left"
        onClick={onSelect}
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{lick.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatTime(lick.start_seconds)} - {formatTime(lick.end_seconds)}
            {lick.last_speed ? ` · ${lick.last_speed.toFixed(2)}x` : ""}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {editing ? "Editing" : active ? "Active" : "Load"}
        </span>
      </button>

      <button
        type="button"
        aria-label={`Edit ${lick.name}`}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onEdit}
      >
        <PencilSimple size={16} weight="bold" />
      </button>

      <button
        type="button"
        aria-label={`Reorder ${lick.name}`}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={18} weight="bold" />
      </button>

      <button
        type="button"
        aria-label={`Delete ${lick.name}`}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
      >
        <Trash size={16} weight="bold" />
      </button>
    </div>
  );
}

interface LickPanelProps {
  activeLick: Lick | null;
  captureIn: () => void;
  captureOut: () => void;
  clearDraft: () => void;
  draftEnd: number | null;
  draftStart: number | null;
  mutateTrack: (updater: (track: Track) => Track) => void;
  replaceTrack: (track: Track) => void;
  setActiveLickId: (lickId: number | null) => void;
  setDraftEnd: (seconds: number | null) => void;
  setDraftStart: (seconds: number | null) => void;
  toggleLick: (lickId: number) => void;
  track: Track;
}

export function LickPanel({
  activeLick,
  captureIn,
  captureOut,
  clearDraft,
  draftEnd,
  draftStart,
  mutateTrack,
  replaceTrack,
  setActiveLickId,
  setDraftEnd,
  setDraftStart,
  toggleLick,
  track,
}: LickPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [editingLickId, setEditingLickId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftEndText, setDraftEndText] = useState("");
  const [draftStartText, setDraftStartText] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const editingLick = track.licks.find((lick) => lick.id === editingLickId) ?? null;

  useEffect(() => {
    setDraftStartText(formatTimestampInput(draftStart));
  }, [draftStart]);

  useEffect(() => {
    setDraftEndText(formatTimestampInput(draftEnd));
  }, [draftEnd]);

  useEffect(() => {
    if (!editingLick) {
      return;
    }

    setDraftName(editingLick.name);
    setDraftStart(editingLick.start_seconds);
    setDraftEnd(editingLick.end_seconds);
  }, [
    editingLick?.id,
    editingLick?.name,
    editingLick?.start_seconds,
    editingLick?.end_seconds,
    editingLick,
    setDraftEnd,
    setDraftStart,
  ]);

  function startNewCapture(capture: () => void) {
    if (activeLick) {
      setActiveLickId(null);
      clearDraft();
      setDraftName("");
    }

    setEditingLickId(null);
    setError("");
    capture();
  }

  function captureTimestamp(capture: () => void) {
    if (editingLick) {
      setError("");
      capture();
      return;
    }

    startNewCapture(capture);
  }

  function startEditing(lick: Lick) {
    setEditingLickId(lick.id);
    setDraftName(lick.name);
    setDraftStart(lick.start_seconds);
    setDraftEnd(lick.end_seconds);
    setError("");
  }

  function updateDraftStart(value: string) {
    setDraftStartText(value);
  }

  function updateDraftEnd(value: string) {
    setDraftEndText(value);
  }

  function clearEditor() {
    setEditingLickId(null);
    clearDraft();
    setDraftName("");
    setError("");
  }

  function stopLoop() {
    setActiveLickId(null);
    if (!editingLick) {
      clearDraft();
      setDraftName("");
    }
    setError("");
  }

  async function handleSave() {
    if (!draftName.trim()) {
      setError("Give the lick a name.");
      return;
    }

    const parsedStart = parseTimestampInput(draftStartText);
    const parsedEnd = parseTimestampInput(draftEndText);
    if (
      parsedStart === null ||
      parsedEnd === null ||
      !Number.isFinite(parsedStart) ||
      !Number.isFinite(parsedEnd) ||
      parsedEnd <= parsedStart
    ) {
      setError("Set a valid in and out point first.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      if (editingLick) {
        const updated = await updateLick(editingLick.id, {
          name: draftName.trim(),
          start_seconds: parsedStart,
          end_seconds: parsedEnd,
        });

        mutateTrack((current) => ({
          ...current,
          licks: sortLicks(
            current.licks.map((lick) => (lick.id === updated.id ? updated : lick))
          ),
        }));
        setEditingLickId(null);
      } else {
        const created = await createLick({
          track: track.id,
          name: draftName.trim(),
          start_seconds: parsedStart,
          end_seconds: parsedEnd,
          position: track.licks.length,
        });

        mutateTrack((current) => ({
          ...current,
          licks: sortLicks([...current.licks, created]),
        }));
        setActiveLickId(created.id);
      }

      clearDraft();
      setDraftName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save lick.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleDelete(lickId: number) {
    if (!window.confirm("Delete this lick?")) {
      return;
    }

    setError("");
    try {
      await deleteLick(lickId);
      mutateTrack((current) => ({
        ...current,
        licks: current.licks.filter((lick) => lick.id !== lickId),
      }));
      if (editingLickId === lickId) {
        setEditingLickId(null);
      }
      if (activeLick?.id === lickId) {
        setActiveLickId(null);
        clearDraft();
        setDraftName("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete lick.");
    }
  }

  async function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const ids = track.licks.map((lick) => lick.id);
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(ids, oldIndex, newIndex);
    mutateTrack((current) => ({
      ...current,
      licks: reordered
        .map((lickId, index) => {
          const lick = current.licks.find((item) => item.id === lickId);
          return lick ? { ...lick, position: index } : null;
        })
        .filter((lick): lick is Lick => lick !== null),
    }));

    try {
      await reorderLicks(track.id, reordered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder licks.");
      replaceTrack(track);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Licks
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Save multiple named loop regions for this track and jump between them instantly.
          </p>
        </div>
        {activeLick ? (
          <Button type="button" variant="ghost" onClick={stopLoop}>
            Stop Loop
          </Button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => captureTimestamp(captureIn)}>
              Set In
            </Button>
            <Button type="button" variant="secondary" onClick={() => captureTimestamp(captureOut)}>
              Set Out
            </Button>
            <Button type="button" variant="ghost" onClick={clearEditor}>
              Clear
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="lick-in-timestamp"
                className="text-sm font-medium text-foreground"
              >
                In point
              </label>
              <Input
                id="lick-in-timestamp"
                value={draftStartText}
                onChange={(event) => updateDraftStart(event.target.value)}
                placeholder="0:10 or 10"
                className="mt-2 h-10 font-semibold"
              />
            </div>
            <div>
              <label
                htmlFor="lick-out-timestamp"
                className="text-sm font-medium text-foreground"
              >
                Out point
              </label>
              <Input
                id="lick-out-timestamp"
                value={draftEndText}
                onChange={(event) => updateDraftEnd(event.target.value)}
                placeholder="0:42 or 42"
                className="mt-2 h-10 font-semibold"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label
              htmlFor="lick-name"
              className="text-sm font-medium text-foreground"
            >
              {editingLick ? "Edit saved lick" : "New lick name"}
            </label>
            <Input
              id="lick-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={editingLick ? "Rename saved lick" : "Intro run"}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={isWorking}>
              {isWorking ? "Saving..." : editingLick ? "Update Lick" : "Save Lick"}
            </Button>
          </div>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="space-y-3">
          {track.licks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
              No saved licks yet. Play the track, mark an in/out region, and save the first loop.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
              <SortableContext items={track.licks.map((lick) => lick.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {track.licks.map((lick) => (
                    <SortableLickRow
                      key={lick.id}
                      lick={lick}
                      active={activeLick?.id === lick.id}
                      editing={editingLickId === lick.id}
                      onSelect={() => toggleLick(lick.id)}
                      onEdit={() => startEditing(lick)}
                      onDelete={() => void handleDelete(lick.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  );
}
