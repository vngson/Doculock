'use client';

import { memo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalyticsData, TrendDataPoint } from '../../analytics/AnalyticsDataContext';
import { ChartSkeleton } from './Skeleton';

function UploadTrendsChartComponent() {
  const { trends, loading } = useAnalyticsData();

  // Show skeleton while loading
  if (loading || trends.length === 0) {
    return <ChartSkeleton />;
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0';
    const k = 1024;
    const sizes = ['', 'K', 'M', 'G'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + sizes[i];
  };

  // Format date - date string is already in local timezone (YYYY-MM-DD)
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-icon">📈</div>
        <h3 className="chart-title">Upload Trends (30 Days)</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trends}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C0FF" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#00C0FF" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="var(--text-secondary)"
              fontSize={12}
            />
            <YAxis stroke="var(--text-secondary)" fontSize={12} />
            <Tooltip
              labelFormatter={(label) => typeof label === 'string' ? formatFullDate(label) : ''}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#00C0FF"
              fillOpacity={1}
              fill="url(#colorCount)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Removed memo to ensure component updates with latest data
export default UploadTrendsChartComponent;
