'use client';

import { memo, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalyticsData } from '../../analytics/AnalyticsDataContext';

interface TrendDataPoint {
  date: string;
  count: number;
  totalSize: number;
  uniqueUsers: number;
  estimatedGas?: number;
}

function GasUsageChartComponent() {
  const { trends } = useAnalyticsData();


  // Memoize gas data calculation to avoid recalculation on re-renders
  const gasData = useMemo(() => {
    return trends.map((item: TrendDataPoint) => ({
      ...item,
      estimatedGas: item.count * 0.003,
    }));
  }, [trends]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-icon">⛽</div>
        <h3 className="chart-title">Estimated Gas Usage (30 Days)</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={gasData}>
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

// Removed memo to ensure component updates with latest data
export default GasUsageChartComponent;
