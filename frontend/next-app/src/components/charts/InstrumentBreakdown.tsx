"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

interface InstrumentData {
  instrument: string;
  duration_hours: number;
  session_count: number;
}

interface InstrumentBreakdownProps {
  token: string;
  apiBaseUrl: string;
  days?: number;
}

// Chart palette derived from design-system tokens (rose/stone scale)
const COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--primary)",
];

export function InstrumentBreakdown({
  token,
  apiBaseUrl,
  days = 30,
}: InstrumentBreakdownProps) {
  const [data, setData] = useState<InstrumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInstrumentData = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/by-instrument/?days=${days}`, {
          headers: { Authorization: `Token ${token}` },
        });
        setData(response.data);
      } catch (requestError) {
        console.error("Error fetching instrument data", requestError);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInstrumentData();
  }, [token, apiBaseUrl, days]);

  const maxHours = useMemo(() => {
    if (!data.length) return 0;
    return Math.max(...data.map((item) => item.duration_hours));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No practice data for the selected period
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Instrument Mix
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            Where your time went in the last {days} days
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.length} instrument{data.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-secondary p-4">
        <div className="space-y-4">
          {data.map((item, index) => {
            const width = maxHours > 0 ? (item.duration_hours / maxHours) * 100 : 0;
            const color = COLORS[index % COLORS.length];

            return (
              <div key={item.instrument} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {item.instrument}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.session_count} session{item.session_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-foreground">
                      {item.duration_hours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-muted-foreground">practice time</p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
