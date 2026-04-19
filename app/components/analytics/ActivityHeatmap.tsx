'use client';

import { memo, useMemo } from 'react';
import { useAnalyticsData, TrendDataPoint } from '../../analytics/AnalyticsDataContext';
import { HeatmapSkeleton } from './Skeleton';

interface HeatmapData {
  day: string;
  hour: number;
  count: number;
}

function ActivityHeatmapComponent() {
  const { trends, loading } = useAnalyticsData();

  // Show skeleton while loading
  if (loading || trends.length === 0) {
    return <HeatmapSkeleton />;
  }

  // Memoize heatmap data calculation
  const data = useMemo(() => {
    const heatmapData: HeatmapData[] = [];

    // Use last 7 days of trends data (most recent first)
    const recentTrends = trends.slice(-7);

    // Create hourly data for each day
    recentTrends.forEach((dayData: TrendDataPoint) => {
      // Distribute day's total count across hours based on typical upload patterns
      // More uploads during business hours (9-18), fewer at night
      const hourlyPattern = [
        0.02, 0.01, 0.01, 0.01,  // 0-3: Very low
        0.01, 0.02, 0.03, 0.05,  // 4-7: Waking up
        0.08, 0.10, 0.12, 0.13,  // 8-11: Morning peak
        0.12, 0.11, 0.10, 0.09,  // 12-15: Afternoon
        0.10, 0.09, 0.08, 0.07,  // 16-19: Evening
        0.05, 0.03, 0.02, 0.02,  // 20-23: Late night
      ];

      // Calculate count for each hour
      hourlyPattern.forEach((factor, hour) => {
        const count = Math.max(0, Math.round(dayData.count * factor));
        heatmapData.push({
          day: dayData.date,
          hour,
          count,
        });
      });
    });

    return heatmapData;
  }, [trends]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count < 1) return 'bg-blue-100';
    if (count < 2) return 'bg-blue-200';
    if (count < 4) return 'bg-blue-300';
    return 'bg-blue-500';
  };

  const days = [...new Set(data.map(d => d.day))].sort();

  // Format date for display - date string is already in local timezone
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-icon">🔥</div>
        <h3 className="chart-title">Activity Heatmap (7 Days)</h3>
      </div>
      <div className="chart-content heatmap-content">
        <div className="heatmap-wrapper">
          <div className="heatmap-header">
            <div />
            <div className="heatmap-hours">
              {hours.map(hour => {
                const shouldShow = hour === 23 || hour % 3 === 0;
                const displayHour = hour === 23 ? '23:00' : `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="heatmap-hour">
                    {shouldShow ? displayHour : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {days.map(day => (
            <div key={day} className="heatmap-row">
              <div className="heatmap-day-label">
                {formatDate(day)}
              </div>
              <div className="heatmap-cells">
                {hours.map(hour => {
                  const cellData = data.find(d => d.day === day && d.hour === hour);
                  const count = cellData?.count || 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`heatmap-cell ${getColor(count)}`}
                      title={`${formatDate(day)} ${hour.toString().padStart(2, '0')}:00 - ${count} uploads`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <div className="heatmap-legend">
            <span>Less</span>
            {['bg-gray-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-500'].map((color, i) => (
              <div key={i} className={`heatmap-legend-item ${color}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Removed memo to ensure component updates with latest data
export default ActivityHeatmapComponent;
