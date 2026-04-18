'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendDataPoint {
  date: string;
  count: number;
  totalSize: number;
  uniqueUsers: number;
}

interface GasUsageChartProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function GasUsageChart({ onLoadingChange }: GasUsageChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    fetch('/api/analytics/trends?days=30')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) {
          console.error('Unexpected data format:', data);
          setData([]);
          setLoading(false);
          return;
        }

        const gasData = data.map((item: TrendDataPoint) => ({
          ...item,
          estimatedGas: item.count * 0.003,
        }));
        setData(gasData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching gas data:', err);
        setData([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="chart-card chart-card--loading">
        <div className="chart-header">
          <div className="chart-icon">⛽</div>
          <h3 className="chart-title">Estimated Gas Usage (30 Days)</h3>
        </div>
        <div className="chart-content chart-content--loading" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-icon">⛽</div>
        <h3 className="chart-title">Estimated Gas Usage (30 Days)</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => `${value.toFixed(3)} MIST`}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              formatter={(value: number) => [`${value.toFixed(4)} MIST`, 'Estimated Gas']}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
              }}
            />
            <Line
              type="monotone"
              dataKey="estimatedGas"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
