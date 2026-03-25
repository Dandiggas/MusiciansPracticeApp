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

const COLORS = ["#f59e0b", "#0f172a", "#14b8a6", "#fb7185", "#38bdf8", "#8b5cf6"];

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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Instrument Mix
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Where your time went in the last {days} days
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          {data.length} instrument{data.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.96))] p-4">
        <div className="space-y-4">
          {data.map((item, index) => {
            const width = maxHours > 0 ? (item.duration_hours / maxHours) * 100 : 0;
            const color = COLORS[index % COLORS.length];

            return (
              <div key={item.instrument} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-sm font-semibold capitalize text-slate-950">
                        {item.instrument}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.session_count} session{item.session_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-950">
                      {item.duration_hours.toFixed(1)}h
                    </p>
                    <p className="text-xs text-slate-500">practice time</p>
                  </div>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
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
