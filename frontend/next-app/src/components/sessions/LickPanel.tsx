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
import { DotsSixVertical, Trash } from "@phosphor-icons/react";

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

function sortLicks(licks: Lick[]) {
  return [...licks].sort((left, right) => left.position - right.position);
}

function SortableLickRow({
  active,
  lick,
  onDelete,
  onSelect,
}: {
  active: boolean;
  lick: Lick;
  onDelete: () => void;
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
        active
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
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {formatTime(lick.start_seconds)} - {formatTime(lick.end_seconds)}
            {lick.last_speed ? ` · ${lick.last_speed.toFixed(2)}x` : ""}
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {active ? "Active" : "Load"}
        </span>
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
  toggleLick,
  track,
}: LickPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setDraftName(activeLick?.name ?? "");
  }, [activeLick?.id, activeLick?.name]);

  function startNewCapture(capture: () => void) {
    if (activeLick) {
      setActiveLickId(null);
      clearDraft();
      setDraftName("");
    }

    setError("");
    capture();
  }

  function stopLoop() {
    setActiveLickId(null);
    clearDraft();
    setDraftName("");
    setError("");
  }

  async function handleSave() {
    if (!draftName.trim()) {
      setError("Give the lick a name.");
      return;
    }
    if (draftStart === null || draftEnd === null || draftEnd <= draftStart) {
      setError("Set a valid in and out point first.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      if (activeLick) {
        const updated = await updateLick(activeLick.id, {
          name: draftName.trim(),
          start_seconds: draftStart,
          end_seconds: draftEnd,
        });

        mutateTrack((current) => ({
          ...current,
          licks: sortLicks(
            current.licks.map((lick) => (lick.id === updated.id ? updated : lick))
          ),
        }));
      } else {
        const created = await createLick({
          track: track.id,
          name: draftName.trim(),
          start_seconds: draftStart,
          end_seconds: draftEnd,
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
            <Button type="button" variant="secondary" onClick={() => startNewCapture(captureIn)}>
              Set In
            </Button>
            <Button type="button" variant="secondary" onClick={() => startNewCapture(captureOut)}>
              Set Out
            </Button>
            <Button type="button" variant="ghost" onClick={clearDraft}>
              Clear
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                In point
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatTime(draftStart)}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Out point
              </p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatTime(draftEnd)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label
              htmlFor="lick-name"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {activeLick ? "Edit active lick" : "New lick name"}
            </label>
            <Input
              id="lick-name"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder={activeLick ? "Rename active lick" : "Intro run"}
            />
          </div>

          <div className="mt-4 flex gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={isWorking}>
              {isWorking ? "Saving..." : activeLick ? "Update Lick" : "Save Lick"}
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
                      onSelect={() => toggleLick(lick.id)}
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
