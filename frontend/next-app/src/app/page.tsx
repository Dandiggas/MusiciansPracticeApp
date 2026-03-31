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
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          The Shed
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
          Opening your workspace...
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          If nothing happens, head to{" "}
          <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
            login
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
