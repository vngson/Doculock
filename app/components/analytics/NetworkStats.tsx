'use client';

import { useEffect, useState } from 'react';

interface AnalyticsStats {
  totalDocuments: number;
  uniqueUsers: number;
  totalFileSize: number;
  avgFileSize: number;
  topMimeTypes: { type: string; count: number }[];
}

const statIcons = {
  documents: '📄',
  users: '👥',
  storage: '💾',
  avgSize: '📏',
};

const statColors = {
  documents: 'var(--primary)',
  users: 'var(--secondary)',
  storage: '#10b981',
  avgSize: '#f59e0b',
};

interface NetworkStatsProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function NetworkStats({ onLoadingChange }: NetworkStatsProps) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !('error' in data)) {
          // Ensure all fields have valid values
          setStats({
            totalDocuments: data.totalDocuments ?? 0,
            uniqueUsers: data.uniqueUsers ?? 0,
            totalFileSize: data.totalFileSize ?? 0,
            avgFileSize: data.avgFileSize ?? 0,
            topMimeTypes: Array.isArray(data.topMimeTypes) ? data.topMimeTypes : [],
          });
        } else {
          console.error('Unexpected data format:', data);
          setStats({
            totalDocuments: 0,
            uniqueUsers: 0,
            totalFileSize: 0,
            avgFileSize: 0,
            topMimeTypes: [],
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stats:', err);
        setStats({
          totalDocuments: 0,
          uniqueUsers: 0,
          totalFileSize: 0,
          avgFileSize: 0,
          topMimeTypes: [],
        });
        setLoading(false);
      });
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return { value: '0', unit: 'Bytes' };
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const unit = sizes[i] || 'Bytes';
    const value = Math.round(bytes / Math.pow(k, i) * 100) / 100;
    return { value: value.toString(), unit };
  };

  if (loading) {
    return (
      <div className="stats-grid stats-grid--loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card stat-card--loading">
            <div className="stat-icon stat-icon--loading" />
            <div className="stat-content">
              <div className="stat-label stat-label--loading" />
              <div className="stat-value stat-value--loading" />
              <div className="stat-subtitle stat-subtitle--loading" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const totalStorageFormatted = stats ? formatBytes(stats.totalFileSize) : { value: '0', unit: 'Bytes' };
  const avgFileSizeFormatted = stats ? formatBytes(stats.avgFileSize) : { value: '0', unit: 'Bytes' };

  const statItems = [
    {
      label: 'Total Documents',
      value: (stats?.totalDocuments || 0).toString(),
      subtitle: 'Verified on-chain',
      icon: statIcons.documents,
      color: statColors.documents,
    },
    {
      label: 'Unique Users',
      value: (stats?.uniqueUsers || 0).toString(),
      subtitle: 'Active addresses',
      icon: statIcons.users,
      color: statColors.users,
    },
    {
      label: 'Total Storage',
      value: totalStorageFormatted.value,
      subtitle: `Data stored (${totalStorageFormatted.unit})`,
      icon: statIcons.storage,
      color: statColors.storage,
    },
    {
      label: 'Avg File Size',
      value: avgFileSizeFormatted.value,
      subtitle: `Per document (${avgFileSizeFormatted.unit})`,
      icon: statIcons.avgSize,
      color: statColors.avgSize,
    },
  ];

  return (
    <div className="stats-grid">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="stat-card"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className="stat-icon" style={{ color: item.color }}>
            {item.icon}
          </div>
          <div className="stat-content">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-subtitle">{item.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
