"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  document_hash: string;
  creator: string;
  file_name: string;
  indexed_at: string;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/documents?limit=5");
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.documents || []);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchRecent();
    const interval = setInterval(fetchRecent, 30000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="activity-feed">
      <h2 className="section-title">Recent Activity</h2>
      <div className="activity-list">
        {items.map((item) => (
          <div key={item.document_hash} className="activity-item">
            <span className="activity-address">
              {truncateAddress(item.creator)}
            </span>
            <span className="activity-action">uploaded</span>
            <span className="activity-filename">{item.file_name}</span>
            <span className="activity-time">{timeAgo(item.indexed_at)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
