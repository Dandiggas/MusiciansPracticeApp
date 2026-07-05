import { SessionList } from "@/components/sessions/SessionList";
import { NewSessionButton } from "@/components/sessions/NewSessionButton";
import { djangoFetchJson } from "@/lib/serverFetch";
import { SessionSummary } from "@/types/session";


export default async function SessionsPage() {
  const sessions = await djangoFetchJson<SessionSummary[]>("sessions/");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Sessions
          </p>
          <h1 className="mt-2 text-4xl font-black leading-[0.98] tracking-tighter text-foreground md:text-5xl">
            Your practice workbench
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Open an existing session or create a new one to keep the songs,
            BPM, and saved practice context together.
          </p>
        </div>
        <NewSessionButton />
      </div>

      <div className="mt-8">
        <SessionList sessions={sessions} />
      </div>
    </div>
  );
}
