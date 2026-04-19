'use client';

import { Suspense, lazy } from 'react';
import { AnalyticsDataProvider, useAnalyticsData } from './AnalyticsDataContext';
import NetworkStats from '../components/analytics/NetworkStats';
import UploadTrendsChart from '../components/analytics/UploadTrendsChart';
import ActivityHeatmap from '../components/analytics/ActivityHeatmap';
import TopVerifiedDocs from '../components/analytics/TopVerifiedDocs';
import { ChartSkeleton, StatsSkeleton, HeatmapSkeleton } from '../components/analytics/Skeleton';

// Lazy load heavy components
const GasUsageChart = lazy(() => import('../components/analytics/GasUsageChart').then(m => ({ default: m.default })));

// Components removed memo to ensure they update with latest data
// Note: Removed memo to fix issue where components showed stale data

function AnalyticsContent() {
  const { stats, trends, loading, error, refresh } = useAnalyticsData();

  if (error) {
    return (
      <div className="tf-card">
        <div className="hp-empty">
          <p>Error loading analytics</p>
          <span>{error}</span>
          <button className="tf-submit" onClick={refresh} style={{ marginTop: '16px' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Dashboard Analytics</h1>
          <p className="analytics-subtitle">
            Data-driven insights for document verification on blockchain
          </p>
        </div>
        <button
          className="hp-refresh"
          onClick={refresh}
          disabled={loading}
          title="Refresh analytics"
          style={{
            padding: '8px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text)',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="analytics-content">
        <div className="stats-section">
          {loading ? <StatsSkeleton /> : <NetworkStats />}
        </div>

        <div className="charts-grid charts-grid--1">
          {loading ? <ChartSkeleton /> : <UploadTrendsChart />}
          <Suspense fallback={<div className="chart-card chart-card--loading"><div className="chart-content chart-content--loading" /></div>}>
            <GasUsageChart />
          </Suspense>
          {loading ? <HeatmapSkeleton /> : <ActivityHeatmap />}
          {loading ? <ChartSkeleton /> : <TopVerifiedDocs />}
        </div>

        <div className="info-card">
          <div className="info-card-icon">📊</div>
          <div className="info-card-content">
            <h3 className="info-card-title">About This Dashboard</h3>
            <p className="info-card-text">
              Real-time insights into document verification activity on DocuLock platform.
              Data is fetched from MongoDB indexer for optimal performance, ensuring accuracy
              and transparency. All timestamps are in Vietnam timezone (UTC+7).
            </p>
            <p className="info-card-note">
              <strong>Note:</strong> Data is automatically synced from Sui blockchain
              for fast, scalable queries. Click Refresh to get the latest data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AnalyticsDataProvider>
      <AnalyticsContent />
    </AnalyticsDataProvider>
  );
}
