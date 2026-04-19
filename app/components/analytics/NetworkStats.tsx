'use client';

import { memo } from 'react';
import { useAnalyticsData } from '../../analytics/AnalyticsDataContext';
import { StatsSkeleton } from './Skeleton';

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
  storage: '#10B981',
  avgSize: '#F59E0B',
};

function NetworkStatsComponent() {
  const { stats, loading } = useAnalyticsData();

  // Show skeleton while loading
  if (loading) {
    return <StatsSkeleton />;
  }

  if (!stats) {
    return null;
  }

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0 || isNaN(bytes)) return { value: '0', unit: 'Bytes' };
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const unit = sizes[i] || 'Bytes';
    const value = Math.round(bytes / Math.pow(k, i) * 100) / 100;
    return { value: value.toString(), unit };
  };

  const totalStorageFormatted = formatBytes(stats.totalFileSize);
  const avgFileSizeFormatted = formatBytes(stats.avgFileSize);

  const statItems = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments.toString(),
      subtitle: 'Verified on-chain',
      icon: statIcons.documents,
      color: statColors.documents,
    },
    {
      label: 'Unique Users',
      value: stats.uniqueUsers.toString(),
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

// Removed memo to ensure component updates with latest data
export default NetworkStatsComponent;
