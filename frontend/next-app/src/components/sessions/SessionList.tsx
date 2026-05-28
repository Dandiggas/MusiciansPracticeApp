import Link from "next/link";

import { SessionSummary } from "@/types/session";


export function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
        <h2 className="text-xl font-bold text-foreground">No sessions yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first session and start collecting the songs and licks
          you are working on in one place.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/sessions/${session.id}`}
          className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-card/90"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{session.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Updated{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(session.updated_at))}
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Open
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
