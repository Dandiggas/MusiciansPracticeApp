import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CaretRight, MusicNotes } from "@phosphor-icons/react/dist/ssr";

import { SessionSummary } from "@/types/session";


export function SessionList({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/60 px-10 py-14 text-center">
        {/* The room, staged and waiting — the bench is literally clear */}
        <Image
          src="/landing/empty-room.jpg"
          alt=""
          fill
          aria-hidden="true"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/55 to-background/35"
        />
        <div className="relative">
          <MusicNotes size={28} className="mx-auto text-muted-foreground" aria-hidden />
          <h2 className="mt-4 text-xl font-bold text-foreground">The bench is clear</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Name your first session in the panel above. The songs, BPMs, and
            licks you practise will collect there, ready for next time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {sessions.map((session, index) => (
        <Link
          key={session.id}
          href={`/sessions/${session.id}`}
          style={{ "--stagger": index } as React.CSSProperties}
          className="rise-in group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-primary/5 active:bg-primary/10"
        >
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">
              {session.name}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Updated {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
            </p>
          </div>
          <CaretRight
            size={18}
            aria-hidden
            className="shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </Link>
      ))}
    </div>
  );
}
