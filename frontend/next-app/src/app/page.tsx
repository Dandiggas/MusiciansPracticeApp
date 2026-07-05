import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { getAuthCookieName } from "@/lib/django-api";

export const metadata: Metadata = {
  title: "The Shed: the practice room that remembers",
  description:
    "Sessions keep your songs, BPMs, loop regions, and recorded takes exactly where you left them. Open a session and keep going.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;

  if (token) {
    redirect("/sessions");
  }

  return <LandingPage />;
}
