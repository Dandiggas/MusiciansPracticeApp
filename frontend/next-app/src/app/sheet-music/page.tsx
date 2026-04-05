"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileText, Search } from "lucide-react";
import {
  listSheetMusic,
  uploadSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

const MAX_STORAGE = 200 * 1024 * 1024;

export default function SheetMusicPage() {
  const [sheets, setSheets] = useState<SheetMusicRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    listSheetMusic()
      .then(setSheets)
      .catch(() => setError("Failed to load sheet music"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const totalStorage = sheets.reduce((sum, s) => sum + s.file_size, 0);
  const storagePercent = Math.min((totalStorage / MAX_STORAGE) * 100, 100);

  const filtered = sheets.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const title = file.name.replace(/\.pdf$/i, "");
      try {
        const sheet = await uploadSheetMusic(title, file);
        setSheets((prev) => [sheet, ...prev]);
      } catch {
        setError("Upload failed. Check file size and format.");
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Sheet Music
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                Your Library
              </h1>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search sheets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-9 rounded-lg bg-secondary border border-border w-48"
                />
              </div>
              <Button
                onClick={handleUpload}
                className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
              >
                <Upload className="mr-1.5 h-4 w-4" /> Upload PDF
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Storage: {(totalStorage / (1024 * 1024)).toFixed(1)} MB / 200 MB
              </span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">
              {sheets.length} sheet{sheets.length !== 1 ? "s" : ""}
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">
                {sheets.length === 0
                  ? "No sheet music yet"
                  : "No results found"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {sheets.length === 0
                  ? "Upload your first PDF to get started."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => router.push(`/sheet-music/${sheet.id}`)}
                  className="group rounded-xl bg-card overflow-hidden text-left transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="bg-white p-4 flex items-center justify-center min-h-[120px]">
                    <FileText className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {sheet.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sheet.page_count} pages &middot;{" "}
                      {(sheet.file_size / 1024).toFixed(0)} KB
                      {sheet.last_page_viewed > 1 &&
                        ` · Bookmarked p.${sheet.last_page_viewed}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
