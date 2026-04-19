'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface TrendDataPoint {
  date: string;      // UTC date string YYYY-MM-DD
  dateMs: number;    // Timestamp in milliseconds
  count: number;
  totalSize: number;
  uniqueUsers: number;
}

interface AnalyticsStats {
  totalDocuments: number;
  uniqueUsers: number;
  totalFileSize: number;
  avgFileSize: number;
  topMimeTypes: { type: string; count: number }[];
}

interface TopDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number | string;
  hash: string;
}

interface AnalyticsData {
  stats: AnalyticsStats | null;
  trends: TrendDataPoint[];
  topDocuments: TopDocument[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Export types for use in components
export type { TrendDataPoint, AnalyticsStats, TopDocument, AnalyticsData };

const AnalyticsDataContext = createContext<AnalyticsData | undefined>(undefined);

interface AnalyticsDataProviderProps {
  children: ReactNode;
}

export function AnalyticsDataProvider({ children }: AnalyticsDataProviderProps) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [topDocuments, setTopDocuments] = useState<TopDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      // Fetch all analytics data in parallel for better performance
      const [statsRes, trendsRes, docsRes] = await Promise.all([
        fetch('/api/analytics/stats'),
        fetch('/api/analytics/trends?days=30'),
        fetch('/api/analytics/documents?limit=10'),
      ]);

      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      if (!trendsRes.ok) throw new Error('Failed to fetch trends');
      if (!docsRes.ok) throw new Error('Failed to fetch documents');

      const [statsData, trendsData, docsData] = await Promise.all([
        statsRes.json(),
        trendsRes.json(),
        docsRes.json(),
      ]);

      setStats(statsData);
      setTrends(Array.isArray(trendsData) ? trendsData : []);
      setTopDocuments(Array.isArray(docsData) ? docsData : []);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setStats(null);
      setTrends([]);
      setTopDocuments([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, []);

  // Expose combined loading state
  const isLoading = loading || isRefreshing;

  return (
    <AnalyticsDataContext.Provider
      value={{ stats, trends, topDocuments, loading: isLoading, error, refresh: () => fetchData(true) }}
    >
      {children}
    </AnalyticsDataContext.Provider>
  );
}

export function useAnalyticsData() {
  const context = useContext(AnalyticsDataContext);
  if (!context) {
    throw new Error('useAnalyticsData must be used within AnalyticsDataProvider');
  }
  return context;
}
