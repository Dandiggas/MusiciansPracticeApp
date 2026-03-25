"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    router.replace(token ? "/dashboard" : "/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_28%),linear-gradient(180deg,_#fffdf7_0%,_#fff_42%,_#f8fafc_100%)] px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
          Practice Tracker
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Opening your workspace...
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          If nothing happens, head to{" "}
          <Link href="/login" className="font-semibold text-slate-950 underline underline-offset-4">
            login
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
