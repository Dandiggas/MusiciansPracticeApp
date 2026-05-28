import { notFound } from "next/navigation";

import { SessionWorkbench } from "@/components/sessions/SessionWorkbench";
import { djangoFetch } from "@/lib/serverFetch";
import { SessionDetail } from "@/types/session";


export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await djangoFetch(`sessions/${id}/`);

  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error("Failed to load session.");
  }

  const session = (await response.json()) as SessionDetail;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 md:px-8">
      <SessionWorkbench session={session} />
    </div>
  );
}
