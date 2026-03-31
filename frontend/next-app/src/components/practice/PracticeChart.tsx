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
          "rgba(186, 158, 255, 0.92)",
          "rgba(132, 85, 239, 0.88)",
          "rgba(110, 59, 215, 0.85)",
          "rgba(155, 255, 206, 0.72)",
          "rgba(88, 231, 171, 0.74)",
          "rgba(186, 158, 255, 0.84)",
          "rgba(132, 85, 239, 0.9)",
          "rgba(110, 59, 215, 0.82)",
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
        hoverBackgroundColor: "#ba9eff",
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
        backgroundColor: "rgba(20, 31, 56, 0.95)",
        titleColor: "#fff",
        bodyColor: "#a3aac4",
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
          color: "#a3aac4",
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
          color: "rgba(163, 170, 196, 0.1)",
          drawTicks: false,
        },
        ticks: {
          color: "#a3aac4",
          callback: (value) => `${value}m`,
          padding: 8,
        },
      },
    },
  };

  return (
    <div className="h-full overflow-hidden rounded-[1.5rem] border border-border bg-secondary p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Timeline
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            Recent sessions
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {chartState.items.length} session{chartState.items.length === 1 ? "" : "s"} shown
        </p>
      </div>
      <div className="h-[280px] overflow-hidden rounded-[1.25rem] pb-2">
        <Bar options={options} data={data} />
      </div>
    </div>
  );
}
