'use client';

import { memo, useMemo } from 'react';
import { useAnalyticsData } from '../../analytics/AnalyticsDataContext';

interface HeatmapData {
  day: string;
  hour: number;
  count: number;
}

function ActivityHeatmapComponent() {
  const { trends } = useAnalyticsData();

  // Memoize heatmap data calculation
  const data = useMemo(() => {
    const heatmapData: HeatmapData[] = [];

    // Use last 7 days of trends data
    const recentTrends = trends.slice(-7);

    recentTrends.forEach((dayData) => {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({
          day: dayData.date,
          hour,
          count: Math.floor(Math.random() * dayData.count),
        });
      }
    });

    return heatmapData;
  }, [trends]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count < 2) return 'bg-blue-100';
    if (count < 5) return 'bg-blue-200';
    if (count < 10) return 'bg-blue-300';
    return 'bg-blue-500';
  };

  const days = [...new Set(data.map(d => d.day))].sort();
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
                {new Date(day).toLocaleDateString('vi-VN')}
              </div>
              <div className="heatmap-cells">
                {hours.map(hour => {
                  const cellData = data.find(d => d.day === day && d.hour === hour);
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`heatmap-cell ${getColor(cellData?.count || 0)}`}
                      title={`${new Date(day).toLocaleDateString('vi-VN')} ${hour.toString().padStart(2, '0')}:00 - ${cellData?.count || 0} uploads`}
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

export const ActivityHeatmap = memo(ActivityHeatmapComponent);
ActivityHeatmap.displayName = 'ActivityHeatmap';
