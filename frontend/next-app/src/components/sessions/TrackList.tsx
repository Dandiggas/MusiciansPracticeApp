"use client";

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
import { DotsSixVertical, MusicNotesSimple } from "@phosphor-icons/react";

import { Track } from "@/types/session";


interface TrackListProps {
  onReorder: (trackIds: number[]) => void;
  onSelectTrack: (trackId: number) => void;
  selectedTrackId: number | null;
  tracks: Track[];
}

function SortableTrackRow({
  isSelected,
  onSelect,
  track,
}: {
  isSelected: boolean;
  onSelect: () => void;
  track: Track;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: track.id });

  return (
    <div
      ref={setNodeRef}
      data-track-row-id={track.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
        isSelected
          ? "border-primary/50 bg-primary/[0.08]"
          : "border-border/60 bg-card/60 hover:border-primary/20 hover:bg-card"
      }`}
    >
      <button
        type="button"
        data-track-select-button
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
      >
        <div className="rounded-xl bg-muted p-2 text-muted-foreground">
          <MusicNotesSimple size={16} weight="regular" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{track.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <span>{track.source_type}</span>
            {track.bpm ? <span>{track.bpm} BPM</span> : null}
            <span>{track.licks.length} licks</span>
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={`Reorder ${track.name}`}
        className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical size={18} weight="bold" />
      </button>
    </div>
  );
}

export function TrackList({
  onReorder,
  onSelectTrack,
  selectedTrackId,
  tracks,
}: TrackListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const ids = tracks.map((track) => track.id);
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(ids, oldIndex, newIndex);
    onReorder(reordered);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tracks.map((track) => track.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tracks.map((track) => (
            <SortableTrackRow
              key={track.id}
              track={track}
              isSelected={track.id === selectedTrackId}
              onSelect={() => onSelectTrack(track.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
