"use client";

import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  ChartOptions,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface PracticeSession {
  session_id?: number;
  display_id?: number;
  user?: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
}

interface PracticeChartProps {
  sessions: PracticeSession[];
}

const timeToMinutes = (time: string) => {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 60 + minutes + seconds / 60;
};

export default function PracticeChart({ sessions }: PracticeChartProps) {
  const chartState = useMemo(() => {
    const recentSessions = [...sessions]
      .sort((a, b) => {
        const dateDiff =
          new Date(a.session_date).getTime() - new Date(b.session_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (a.session_id || 0) - (b.session_id || 0);
      })
      .slice(-8);

    const formatLabel = (session: PracticeSession, index: number) => {
      const sessionNumber = session.display_id ?? session.session_id ?? index + 1;
      return `S${sessionNumber}`;
    };

    const formatDate = (date: string) =>
      new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(new Date(date));

    const items = recentSessions.map((session, index) => ({
      label: formatLabel(session, index),
      minutes: Number(timeToMinutes(session.duration).toFixed(1)),
      instrument: session.instrument,
      description: session.description,
      duration: session.duration,
      dateLabel: formatDate(session.session_date),
    }));

    return {
      items,
      labels: items.map((item) => item.label),
      durations: items.map((item) => item.minutes),
    };
  }, [sessions]);

  const data = {
    labels: chartState.labels,
    datasets: [
      {
        label: "Session Length",
        data: chartState.durations,
        backgroundColor: [
          "rgba(245, 158, 11, 0.92)",
          "rgba(249, 115, 22, 0.88)",
          "rgba(234, 179, 8, 0.85)",
          "rgba(14, 165, 233, 0.72)",
          "rgba(56, 189, 248, 0.74)",
          "rgba(245, 158, 11, 0.84)",
          "rgba(249, 115, 22, 0.9)",
          "rgba(234, 179, 8, 0.82)",
        ],
        borderRadius: {
          topLeft: 24,
          topRight: 24,
          bottomLeft: 0,
          bottomRight: 0,
        },
        borderSkipped: false,
        maxBarThickness: 48,
        categoryPercentage: 0.72,
        barPercentage: 0.72,
        clip: 8,
        hoverBackgroundColor: "#0f172a",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 8,
        right: 8,
        bottom: 10,
        left: 4,
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        titleColor: "#fff",
        bodyColor: "#e2e8f0",
        displayColors: false,
        padding: 14,
        callbacks: {
          title: (context) => {
            const item = chartState.items[context[0].dataIndex];
            return `${item.instrument} · ${item.dateLabel}`;
          },
          label: (context) => {
            const item = chartState.items[context.dataIndex];
            const detail = item.description ? ` - ${item.description}` : "";
            return `${context.parsed.y.toFixed(1)} minutes${detail}`;
          },
          afterLabel: (context) => {
            const item = chartState.items[context.dataIndex];
            return `Duration ${item.duration}`;
          },
        },
      },
    },
    scales: {
      x: {
        offset: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          maxRotation: 0,
          autoSkip: true,
          padding: 12,
          font: {
            size: 11,
            weight: 600,
          },
        },
      },
      y: {
        beginAtZero: true,
        grace: "8%",
        border: {
          display: false,
        },
        grid: {
          color: "rgba(148, 163, 184, 0.16)",
          drawTicks: false,
        },
        ticks: {
          color: "#64748b",
          callback: (value) => `${value}m`,
          padding: 8,
        },
      },
    },
  };

  return (
    <div className="h-full overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.96))] p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Timeline
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            Recent sessions
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          {chartState.items.length} session{chartState.items.length === 1 ? "" : "s"} shown
        </p>
      </div>
      <div className="h-[280px] overflow-hidden rounded-[1.25rem] pb-2">
        <Bar options={options} data={data} />
      </div>
    </div>
  );
}
