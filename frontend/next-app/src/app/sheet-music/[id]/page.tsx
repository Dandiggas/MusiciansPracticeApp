"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SheetMusicWidget from "@/components/studio/SheetMusicWidget";
import {
  getSheetMusic,
  updateSheetMusic,
  deleteSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

export default function SheetMusicViewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sheet, setSheet] = useState<SheetMusicRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    getSheetMusic(Number(id))
      .then(setSheet)
      .catch(() => setError("Sheet music not found"))
      .finally(() => setIsLoading(false));
  }, [id, router]);

  const handleTitleChange = async (newTitle: string) => {
    if (!sheet) return;
    setSheet({ ...sheet, title: newTitle });
    try {
      await updateSheetMusic(sheet.id, { title: newTitle });
    } catch {
      setSheet((prev) => prev);
    }
  };

  const handleDelete = async () => {
    if (!sheet || !confirm("Delete this sheet music? This cannot be undone.")) return;
    try {
      await deleteSheetMusic(sheet.id);
      router.push("/sheet-music");
    } catch {
      setError("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Not found"}</p>
          <Button variant="secondary" onClick={() => router.push("/sheet-music")}>
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/sheet-music")}
            className="rounded-lg"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Library
          </Button>
          <SheetMusicWidget
            sheetMusicId={sheet.id}
            title={sheet.title}
            pageCount={sheet.page_count}
            initialPage={sheet.last_page_viewed}
            standalone
            onTitleChange={handleTitleChange}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
