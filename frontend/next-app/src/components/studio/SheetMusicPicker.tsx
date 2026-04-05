"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText } from "lucide-react";
import {
  listSheetMusic,
  uploadSheetMusic,
  type SheetMusicRecord,
} from "@/lib/sheet-music-api";

interface SheetMusicPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sheet: SheetMusicRecord) => void;
}

export default function SheetMusicPicker({
  open,
  onClose,
  onSelect,
}: SheetMusicPickerProps) {
  const [sheets, setSheets] = useState<SheetMusicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    listSheetMusic()
      .then(setSheets)
      .catch(() => setError("Failed to load sheet music"))
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadTitle.trim()) return;

    setUploading(true);
    setError("");
    try {
      const sheet = await uploadSheetMusic(uploadTitle.trim(), file);
      onSelect(sheet);
      onClose();
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { data?: Record<string, unknown> } }).response?.data
      ) {
        const data = (err as { response: { data: Record<string, string[]> } }).response.data;
        const msg = Object.values(data).flat().join(" ");
        setError(msg || "Upload failed");
      } else {
        setError("Upload failed");
      }
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {showUpload ? "Upload Sheet Music" : "Select Sheet Music"}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <p className="text-sm text-destructive mb-3">{error}</p>
        )}

        {showUpload ? (
          <div className="space-y-4">
            <Input
              placeholder="Title (e.g. All of Me - Lead Sheet)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="h-11 rounded-lg bg-secondary border border-border"
            />
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && !uploadTitle.trim()) {
                  setUploadTitle(file.name.replace(/\.pdf$/i, ""));
                }
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading || !uploadTitle.trim()}
                className="rounded-lg bg-gradient-to-r from-primary to-[#8455ef] text-primary-foreground"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowUpload(false)}
                className="rounded-lg"
              >
                Back to Library
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => setShowUpload(true)}
              variant="secondary"
              className="w-full rounded-lg"
            >
              <Upload className="mr-2 h-4 w-4" /> Upload New PDF
            </Button>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : sheets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sheet music yet. Upload your first PDF.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    onClick={() => {
                      onSelect(sheet);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
                  >
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {sheet.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.page_count} pages &middot;{" "}
                        {(sheet.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
