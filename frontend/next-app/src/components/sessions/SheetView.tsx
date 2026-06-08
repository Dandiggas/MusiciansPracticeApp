"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(320);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateWidth = () => {
      setPageWidth(Math.max(280, Math.min(760, node.clientWidth - 24)));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

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
        <Image
          src={track.file}
          alt={track.name}
          width={1400}
          height={1800}
          sizes="(max-width: 768px) 100vw, 760px"
          unoptimized
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
            aria-label="Previous sheet page"
            onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            disabled={pageNumber <= 1}
            className="min-h-11 min-w-11 px-3"
          >
            <CaretLeft size={16} weight="bold" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Next sheet page"
            onClick={() => setPageNumber((page) => Math.min(pageCount || 1, page + 1))}
            disabled={pageNumber >= pageCount}
            className="min-h-11 min-w-11 px-3"
          >
            <CaretRight size={16} weight="bold" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="overflow-auto rounded-2xl border border-border/60 bg-muted/30 p-3">
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
          <Page pageNumber={pageNumber} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    </div>
  );
}
