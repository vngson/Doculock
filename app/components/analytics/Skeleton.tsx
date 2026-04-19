'use client';

export function StatsSkeleton() {
  return (
    <div className="stats-grid">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="stat-card skeleton">
          <div className="stat-icon skeleton-icon" />
          <div className="stat-content">
            <div className="stat-label skeleton-text" />
            <div className="stat-value skeleton-value" />
            <div className="stat-subtitle skeleton-text" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="chart-card skeleton">
      <div className="chart-header">
        <div className="chart-icon skeleton-icon" />
        <div className="chart-title skeleton-title" />
      </div>
      <div className="chart-content skeleton-chart">
        <div className="chart-bars">
          {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
            <div key={bar} className="skeleton-bar" style={{ height: `${40 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = 4;

  return (
    <div className="chart-card skeleton">
      <div className="chart-header">
        <div className="chart-icon skeleton-icon" />
        <div className="chart-title skeleton-title" />
      </div>
      <div className="chart-content">
        <div className="heatmap">
          <div className="heatmap-labels">
            {days.map((day) => (
              <div key={day} className="heatmap-day-label skeleton-text-small" />
            ))}
          </div>
          <div className="heatmap-grid">
            {Array.from({ length: weeks * days.length }).map((_, i) => (
              <div key={i} className="heatmap-cell skeleton-cell" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentListSkeleton() {
  return (
    <div className="chart-card skeleton">
      <div className="chart-header">
        <div className="chart-icon skeleton-icon" />
        <div className="chart-title skeleton-title" />
      </div>
      <div className="chart-content">
        <div className="document-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="document-item skeleton-item">
              <div className="document-info">
                <div className="document-name skeleton-text" />
                <div className="document-meta skeleton-text-small" />
              </div>
              <div className="document-size skeleton-value-small" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
