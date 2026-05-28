"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { Track } from "@/types/session";


pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function SheetView({ track }: { track: Track }) {
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  if (!track.file) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-sm text-muted-foreground">
        This track does not have a sheet file attached.
      </div>
    );
  }

  if (track.source_type === "image") {
    return (
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <img
          src={track.file}
          alt={track.name}
          className="max-h-[72vh] w-full rounded-xl object-contain"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sheet music
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Page {pageNumber} of {pageCount || 1}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            disabled={pageNumber <= 1}
          >
            <CaretLeft size={16} weight="bold" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPageNumber((page) => Math.min(pageCount || 1, page + 1))}
            disabled={pageNumber >= pageCount}
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3">
        <Document
          file={track.file}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setPageNumber(1);
          }}
          onLoadError={() => {
            setPageCount(0);
          }}
          loading={<p className="text-sm text-muted-foreground">Loading PDF...</p>}
        >
          <Page pageNumber={pageNumber} width={760} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    </div>
  );
}
