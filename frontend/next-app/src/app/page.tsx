import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { getAuthCookieName } from "@/lib/django-api";

export const metadata: Metadata = {
  title: "The Shed: the practice room that remembers",
  description:
    "A saved practice workspace for musicians: keep each song's audio, charts, tempo, loops, notes, and recorded takes together so you can pick up where you left off.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (token) {
    redirect("/sessions");
  }

  return <LandingPage />;
}
