"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getSheetMusicFileUrl } from "@/lib/sheet-music-api";

interface SheetMusicWidgetProps {
  sheetMusicId: number;
  title: string;
  pageCount: number;
  initialPage?: number;
  initialExpanded?: boolean;
  standalone?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDelete?: () => void;
}

export default function SheetMusicWidget({
  sheetMusicId,
  title,
  pageCount,
  initialPage = 1,
  initialExpanded = false,
  standalone = false,
  onTitleChange,
  onDelete,
}: SheetMusicWidgetProps) {
  const [collapsed, setCollapsed] = useState(!standalone && !initialExpanded);
  const [currentPage] = useState(initialPage);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const fileUrl = getSheetMusicFileUrl(sheetMusicId);

  // Fetch the PDF with auth header and create a blob URL for the iframe
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    fetch(fileUrl, { headers: { Authorization: `Token ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch PDF");
        return res.blob();
      })
      .then((blob) => {
        setPdfBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => setPdfError(true));

    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Browser's PDF viewer handles zoom/page nav natively.
  // We just track the initial page for the #page= fragment.

  if (collapsed) {
    return (
      <div
        className="rounded-xl bg-card p-4 flex items-center justify-between cursor-pointer hover:bg-card/80 transition-colors"
        onClick={() => setCollapsed(false)}
      >
        <div className="flex items-center gap-3">
          <span className="text-primary text-lg">♩</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              {pageCount} pages
            </p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-primary text-lg">♩</span>
          {standalone && onTitleChange ? (
            <input
              className="text-sm font-semibold text-foreground bg-transparent border-none outline-none focus:ring-1 focus:ring-ring rounded px-1"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">{title}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{pageCount} pages</span>
          {standalone && onDelete && (
            <button
              onClick={onDelete}
              className="text-destructive text-xs font-semibold px-2 py-1 rounded-lg hover:bg-destructive/10"
            >
              Delete
            </button>
          )}
          {!standalone && (
            <button onClick={() => setCollapsed(true)}>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className="bg-muted/50 min-h-[500px]"
      >
        {pdfError ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <p className="text-sm text-destructive">Failed to load PDF</p>
          </div>
        ) : !pdfBlobUrl ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : (
          <iframe
            src={`${pdfBlobUrl}#page=${currentPage}`}
            className="w-full rounded-b-xl"
            style={{ height: "70vh", minHeight: "500px" }}
            title={title}
          />
        )}
      </div>
    </div>
  );
}
