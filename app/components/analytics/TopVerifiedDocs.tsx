'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TopDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number | string;
  hash: string;
}

interface TopVerifiedDocsProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function TopVerifiedDocs({ onLoadingChange }: TopVerifiedDocsProps) {
  const [documents, setDocuments] = useState<TopDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onLoadingChange?.(loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    fetch('/api/analytics/documents?limit=10')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDocuments(data);
        } else {
          console.error('Unexpected data format:', data);
          setDocuments([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching documents:', err);
        setDocuments([]);
        setLoading(false);
      });
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0';
    const k = 1024;
    const sizes = ['', 'K', 'M', 'G'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + sizes[i];
  };

  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16', '#6366f1', '#14b8a6'];

  const chartData = documents.map((doc, index) => ({
    name: doc.fileName.length > 20 ? doc.fileName.substring(0, 20) + '...' : doc.fileName,
    size: doc.fileSize,
    fullName: doc.fileName,
    color: colors[index % colors.length],
  }));

  if (loading) {
    return (
      <div className="chart-card chart-card--loading">
        <div className="chart-header">
          <div className="chart-icon">📊</div>
          <h3 className="chart-title">Top Documents by Size</h3>
        </div>
        <div className="chart-content chart-content--loading" />
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-icon">📊</div>
        <h3 className="chart-title">Top Documents by Size</h3>
      </div>
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={(value) => formatBytes(value)}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            />
            <Tooltip
              formatter={(value: number) => [formatBytes(value), 'Size']}
              labelFormatter={(label: string) => {
                const item = chartData.find(d => d.name === label);
                return item?.fullName || label;
              }}
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text)',
              }}
            />
            <Bar dataKey="size" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
