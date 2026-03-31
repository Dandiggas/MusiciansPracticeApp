"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import CalendarHeatmap from "react-calendar-heatmap";
import { subDays, format } from "date-fns";
import "react-calendar-heatmap/dist/styles.css";

interface CalendarData {
  date: string;
  duration_minutes: number;
  session_count: number;
}

interface HeatmapValue {
  date: string;
  count: number;
}

interface CalendarHeatmapProps {
  token: string;
  apiBaseUrl: string;
}

declare module "react-calendar-heatmap";

export function PracticeCalendarHeatmap({
  token,
  apiBaseUrl,
}: CalendarHeatmapProps) {
  const [data, setData] = useState<HeatmapValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/calendar/?days=365`, {
          headers: { Authorization: `Token ${token}` },
        });

        const formatted: HeatmapValue[] = response.data.map((item: CalendarData) => ({
          date: item.date,
          count: Math.round(item.duration_minutes),
        }));

        setData(formatted);
      } catch (requestError) {
        console.error("Error fetching calendar data", requestError);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCalendarData();
  }, [token, apiBaseUrl]);

  const summary = useMemo(() => {
    const activeDays = data.filter((item) => item.count > 0).length;
    const totalMinutes = data.reduce((sum, item) => sum + item.count, 0);
    return { activeDays, totalMinutes };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-52 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const today = new Date();
  const startDate = subDays(today, 365);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <style jsx global>{`
        .react-calendar-heatmap {
          min-width: 760px;
        }
        .react-calendar-heatmap text {
          font-size: 10px;
          fill: #a3aac4;
          font-weight: 600;
        }
        .react-calendar-heatmap rect {
          rx: 3px;
          ry: 3px;
          shape-rendering: geometricPrecision;
        }
        .react-calendar-heatmap .color-empty {
          fill: #1f2b49;
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: #3b2a6e;
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: #6e3bd7;
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: #8455ef;
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: #ba9eff;
        }
        .react-calendar-heatmap rect:hover {
          stroke: #ba9eff;
          stroke-width: 1.5px;
        }
      `}</style>

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Consistency
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            Practice rhythm over the last year
          </h3>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-border bg-secondary px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Active Days
            </p>
            <p className="mt-1 text-lg font-black text-foreground">{summary.activeDays}</p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Total Time
            </p>
            <p className="mt-1 text-lg font-black text-foreground">
              {Math.round(summary.totalMinutes / 60)}h
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border bg-secondary p-4">
        <CalendarHeatmap
          startDate={startDate}
          endDate={today}
          values={data}
          classForValue={(value: HeatmapValue | undefined) => {
            if (!value || value.count === 0) return "color-empty";
            if (value.count < 20) return "color-scale-1";
            if (value.count < 45) return "color-scale-2";
            if (value.count < 75) return "color-scale-3";
            return "color-scale-4";
          }}
          tooltipDataAttrs={(value?: HeatmapValue) => {
            if (!value?.date) return {};
            return {
              "data-tip": `${format(new Date(value.date), "MMM d, yyyy")}: ${value.count || 0} minutes`,
            };
          }}
          showWeekdayLabels
        />

        <div className="mt-5 flex items-center gap-3 text-xs font-medium text-muted-foreground">
          <span>Light</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-[3px] bg-[#1f2b49]" />
            <div className="h-3 w-3 rounded-[3px] bg-[#3b2a6e]" />
            <div className="h-3 w-3 rounded-[3px] bg-[#6e3bd7]" />
            <div className="h-3 w-3 rounded-[3px] bg-[#8455ef]" />
            <div className="h-3 w-3 rounded-[3px] bg-[#ba9eff]" />
          </div>
          <span>Deep</span>
        </div>
      </div>
    </div>
  );
}
