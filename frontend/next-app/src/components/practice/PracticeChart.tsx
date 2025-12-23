"use client";

import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PracticeSession {
  session_id?: number;
  user?: number;
  instrument: string;
  duration: string;
  description: string;
  session_date: string;
}

interface PracticeChartProps {
  sessions: PracticeSession[];
}

const timeToSeconds = (time: string) => {
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const PracticeChart = ({ sessions }: PracticeChartProps) => {
  const processDataForChart = () => {
    const dataPerInstrument: { [key: string]: { [key: string]: number } } = {};

    sessions.forEach(session => {
      const date = session.session_date;
      const instrument = session.instrument;
      const durationInSeconds = timeToSeconds(session.duration);

      if (!dataPerInstrument[instrument]) {
        dataPerInstrument[instrument] = {};
      }

      if (!dataPerInstrument[instrument][date]) {
        dataPerInstrument[instrument][date] = 0;
      }

      dataPerInstrument[instrument][date] += durationInSeconds;
    });

    return dataPerInstrument;
  };

  const chartData = processDataForChart();

  const firstInstrument = Object.keys(chartData)[0];
  const dates = Object.keys(chartData[firstInstrument] || {}).sort();
  const durations = dates.map(date => (chartData[firstInstrument]?.[date] || 0) / 60); // Convert seconds to minutes

  const data = {
    labels: dates,
    datasets: [
      {
        label: `Practice Time for ${firstInstrument}`,
        data: durations,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Duration in Minutes'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Session Date'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Practice Time for ${firstInstrument}`
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  return <Line options={options} data={data} />;
};

export default PracticeChart;
