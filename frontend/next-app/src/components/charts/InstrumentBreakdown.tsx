"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

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

export function InstrumentBreakdown({ token, apiBaseUrl, days = 30 }: InstrumentBreakdownProps) {
  const [data, setData] = useState<InstrumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInstrumentData = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/by-instrument/?days=${days}`, {
          headers: { 'Authorization': `Token ${token}` }
        });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching instrument data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstrumentData();
  }, [token, apiBaseUrl, days]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No practice data for the selected period
      </div>
    );
  }

  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
  ];

  const chartData = {
    labels: data.map(item => item.instrument),
    datasets: [
      {
        label: 'Practice Hours',
        data: data.map(item => item.duration_hours),
        backgroundColor: colors.slice(0, data.length),
        borderColor: colors.slice(0, data.length).map(color => color),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'hsl(var(--foreground))',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const item = data[context.dataIndex];
            return [
              `${label}: ${value.toFixed(1)} hours`,
              `Sessions: ${item.session_count}`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Practice Distribution</h3>
        <p className="text-sm text-muted-foreground">
          Time spent on each instrument (last {days} days)
        </p>
      </div>
      <div className="h-64 md:h-80">
        <Doughnut data={chartData} options={options} />
      </div>
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.map((item, index) => (
          <div key={item.instrument} className="text-center p-3 rounded-lg border">
            <div
              className="w-4 h-4 rounded-full mx-auto mb-2"
              style={{ backgroundColor: colors[index] }}
            ></div>
            <p className="font-medium text-sm">{item.instrument}</p>
            <p className="text-xs text-muted-foreground">
              {item.duration_hours.toFixed(1)}h ({item.session_count} sessions)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
