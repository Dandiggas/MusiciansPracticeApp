"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subDays, format } from 'date-fns';
import 'react-calendar-heatmap/dist/styles.css';

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

export function PracticeCalendarHeatmap({ token, apiBaseUrl }: CalendarHeatmapProps) {
  const [data, setData] = useState<HeatmapValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/calendar/?days=365`, {
          headers: { 'Authorization': `Token ${token}` }
        });

        const formatted: HeatmapValue[] = response.data.map((item: CalendarData) => ({
          date: item.date,
          count: Math.round(item.duration_minutes),
        }));

        setData(formatted);
      } catch (error) {
        console.error('Error fetching calendar data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [token, apiBaseUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const today = new Date();
  const startDate = subDays(today, 365);

  return (
    <div className="w-full overflow-x-auto pb-4">
      <style jsx global>{`
        .react-calendar-heatmap {
          font-size: 12px;
        }
        .react-calendar-heatmap text {
          font-size: 10px;
          fill: hsl(var(--muted-foreground));
        }
        .react-calendar-heatmap .color-empty {
          fill: hsl(var(--muted));
        }
        .react-calendar-heatmap .color-scale-1 {
          fill: #9be9a8;
        }
        .react-calendar-heatmap .color-scale-2 {
          fill: #40c463;
        }
        .react-calendar-heatmap .color-scale-3 {
          fill: #30a14e;
        }
        .react-calendar-heatmap .color-scale-4 {
          fill: #216e39;
        }
        .react-calendar-heatmap rect:hover {
          stroke: hsl(var(--foreground));
          stroke-width: 1px;
        }
      `}</style>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Practice Activity</h3>
        <p className="text-sm text-muted-foreground">
          Your practice activity over the last year
        </p>
      </div>
      <CalendarHeatmap
        startDate={startDate}
        endDate={today}
        values={data}
        classForValue={(value) => {
          if (!value || value.count === 0) {
            return 'color-empty';
          }
          if (value.count < 30) {
            return 'color-scale-1';
          }
          if (value.count < 60) {
            return 'color-scale-2';
          }
          if (value.count < 90) {
            return 'color-scale-3';
          }
          return 'color-scale-4';
        }}
        tooltipDataAttrs={(value: any) => {
          if (!value || !value.date) {
            return {};
          }
          return {
            'data-tip': `${format(new Date(value.date), 'MMM d, yyyy')}: ${value.count || 0} minutes`,
          };
        }}
        showWeekdayLabels
      />
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'hsl(var(--muted))' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ background: '#9be9a8' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ background: '#40c463' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ background: '#30a14e' }}></div>
          <div className="w-3 h-3 rounded-sm" style={{ background: '#216e39' }}></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
