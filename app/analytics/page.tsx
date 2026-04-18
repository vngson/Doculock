'use client';

import { useState, createContext, useContext, useCallback, useRef, memo } from 'react';
import { NetworkStats } from '../components/analytics/NetworkStats';
import { UploadTrendsChart } from '../components/analytics/UploadTrendsChart';
import { ActivityHeatmap } from '../components/analytics/ActivityHeatmap';
import { TopVerifiedDocs } from '../components/analytics/TopVerifiedDocs';
import { GasUsageChart } from '../components/analytics/GasUsageChart';

interface AnalyticsLoadingContextType {
  registerLoader: (id: string) => void;
  unregisterLoader: (id: string) => void;
}

const AnalyticsLoadingContext = createContext<AnalyticsLoadingContextType | null>(null);

function useAnalyticsLoading() {
  const context = useContext(AnalyticsLoadingContext);
  if (!context) {
    throw new Error('useAnalyticsLoading must be used within AnalyticsLoadingProvider');
  }
  return context;
}

function AnalyticsLoadingProvider({ children }: { children: React.ReactNode }) {
  const [loaders, setLoaders] = useState<Set<string>>(new Set());
  const loadersRef = useRef<Set<string>>(new Set());

  const isLoading = loaders.size > 0;

  const registerLoader = useCallback((id: string) => {
    setLoaders(prev => {
      const next = new Set(prev);
      next.add(id);
      loadersRef.current = next;
      return next;
    });
  }, []);

  const unregisterLoader = useCallback((id: string) => {
    setLoaders(prev => {
      const next = new Set(prev);
      next.delete(id);
      loadersRef.current = next;
      return next;
    });
  }, []);

  return (
    <AnalyticsLoadingContext.Provider value={{ registerLoader, unregisterLoader }}>
      {isLoading && (
        <div className="analytics-loading-overlay">
          <div className="analytics-loading-text">
            Loading Analytics
            <div className="analytics-loading-dots">
              <div className="analytics-loading-dot" />
              <div className="analytics-loading-dot" />
              <div className="analytics-loading-dot" />
            </div>
          </div>
        </div>
      )}
      {children}
    </AnalyticsLoadingContext.Provider>
  );
}

// Wrapper components that register with loading context
function NetworkStatsWithLoading() {
  const { registerLoader, unregisterLoader } = useAnalyticsLoading();
  const handleLoadingChange = useCallback((loading: boolean) => {
    loading ? registerLoader('networkStats') : unregisterLoader('networkStats');
  }, [registerLoader, unregisterLoader]);
  return <NetworkStats onLoadingChange={handleLoadingChange} />;
}

function UploadTrendsChartWithLoading() {
  const { registerLoader, unregisterLoader } = useAnalyticsLoading();
  const handleLoadingChange = useCallback((loading: boolean) => {
    loading ? registerLoader('uploadTrends') : unregisterLoader('uploadTrends');
  }, [registerLoader, unregisterLoader]);
  return <UploadTrendsChart onLoadingChange={handleLoadingChange} />;
}

function GasUsageChartWithLoading() {
  const { registerLoader, unregisterLoader } = useAnalyticsLoading();
  const handleLoadingChange = useCallback((loading: boolean) => {
    loading ? registerLoader('gasUsage') : unregisterLoader('gasUsage');
  }, [registerLoader, unregisterLoader]);
  return <GasUsageChart onLoadingChange={handleLoadingChange} />;
}

function ActivityHeatmapWithLoading() {
  const { registerLoader, unregisterLoader } = useAnalyticsLoading();
  const handleLoadingChange = useCallback((loading: boolean) => {
    loading ? registerLoader('heatmap') : unregisterLoader('heatmap');
  }, [registerLoader, unregisterLoader]);
  return <ActivityHeatmap onLoadingChange={handleLoadingChange} />;
}

function TopVerifiedDocsWithLoading() {
  const { registerLoader, unregisterLoader } = useAnalyticsLoading();
  const handleLoadingChange = useCallback((loading: boolean) => {
    loading ? registerLoader('topDocs') : unregisterLoader('topDocs');
  }, [registerLoader, unregisterLoader]);
  return <TopVerifiedDocs onLoadingChange={handleLoadingChange} />;
}

export default function AnalyticsPage() {
  return (
    <AnalyticsLoadingProvider>
      <div className="analytics-container">
        <div className="analytics-header">
          <div>
            <h1 className="analytics-title">Dashboard Analytics</h1>
            <p className="analytics-subtitle">
              Data-driven insights for document verification on the blockchain
            </p>
          </div>
        </div>

        <div className="analytics-content">
          <div className="stats-section">
            <NetworkStatsWithLoading />
          </div>

          <div className="charts-grid charts-grid--1">
  <UploadTrendsChart />
  <GasUsageChart />
  <ActivityHeatmap />
  <TopVerifiedDocs />
</div>

          <div className="info-card">
            <div className="info-card-icon">📊</div>
            <div className="info-card-content">
              <h3 className="info-card-title">About This Dashboard</h3>
              <p className="info-card-text">
                Real-time insights into document verification activity on the DocuLock platform.
                Data is fetched directly from the Sui blockchain events system, ensuring accuracy
                and transparency.
              </p>
              <p className="info-card-note">
                <strong>Note:</strong> Gas usage estimates are based on average transaction costs
                of ~0.003 MIST per document storage. Actual costs may vary based on network conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnalyticsLoadingProvider>
  );
}
