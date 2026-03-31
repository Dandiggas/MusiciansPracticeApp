"use client";

import React from "react";

interface FocusPointsProps {
  notes: string;
  onNotesChange: (value: string) => void;
}

export default function FocusPoints({ notes, onNotesChange }: FocusPointsProps) {
  return (
    <div className="rounded-xl bg-card p-5 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        Focus Points
      </p>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="What are you focusing on this session?"
        rows={3}
        className="w-full rounded-lg bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
      />
    </div>
  );
}
