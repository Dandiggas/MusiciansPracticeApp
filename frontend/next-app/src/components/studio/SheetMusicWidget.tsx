"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { updateSheetMusic, getSheetMusicFileUrl } from "@/lib/sheet-music-api";

// react-pdf uses canvas/DOMMatrix APIs that don't exist during SSR.
// Dynamic import with ssr:false ensures it only loads client-side.
// Worker loaded from CDN to avoid bundling the 40MB pdfjs-dist worker
// which causes OOM on Railway's Docker builder.
const Document = dynamic(
  () => import("react-pdf").then((mod) => {
    mod.pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";
    return { default: mod.Document };
  }),
  { ssr: false }
);

const PDFPage = dynamic(
  () => import("react-pdf").then((mod) => ({ default: mod.Page })),
  { ssr: false }
);

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
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileUrl = getSheetMusicFileUrl(sheetMusicId);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [collapsed]);

  const saveBookmark = useCallback(
    (page: number) => {
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      bookmarkTimer.current = setTimeout(() => {
        updateSheetMusic(sheetMusicId, { last_page_viewed: page }).catch(
          () => {}
        );
      }, 1000);
    },
    [sheetMusicId]
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, pageCount));
      setCurrentPage(clamped);
      saveBookmark(clamped);
    },
    [pageCount, saveBookmark]
  );

  useEffect(() => {
    if (collapsed) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPage(currentPage - 1);
      if (e.key === "ArrowRight") goToPage(currentPage + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [collapsed, currentPage, goToPage]);

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
              Page {currentPage} of {pageCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
            Resume at page {currentPage}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
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
          <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <span className="text-xs text-foreground px-1.5 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={() => setScale((s) => Math.min(2.0, s + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <span className="text-xs text-foreground px-2">
              {currentPage} / {pageCount}
            </span>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <button
            className="text-primary bg-primary/10 rounded-lg p-1.5"
            title="Bookmarked"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </button>
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
        className="flex justify-center bg-muted/50 p-5 min-h-[400px] overflow-auto"
      >
        <Document
          file={fileUrl}
          options={{
            httpHeaders: token ? { Authorization: `Token ${token}` } : {},
          }}
          loading={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          }
          error={
            <div className="flex items-center justify-center min-h-[400px]">
              <p className="text-sm text-destructive">Failed to load PDF</p>
            </div>
          }
        >
          <PDFPage
            pageNumber={currentPage}
            scale={scale}
            width={containerWidth > 0 ? containerWidth - 40 : undefined}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
