'use client';

import { useEffect, useRef, useState } from 'react';

interface NetworkStatsProps {
  totalDocuments?: number;
  totalCreators?: number;
}

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start || target === 0) return;
    let startTime: number;
    let raf: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);

  return count;
}

const stats = [
  { key: 'totalDocuments', label: 'Documents', icon: 'doc', fallback: '--' },
  { key: 'totalCreators', label: 'Creators', icon: 'user', fallback: '--' },
  { key: 'finality', label: 'Finality', icon: 'speed', value: '~400ms' },
  { key: 'algorithm', label: 'Algorithm', icon: 'lock', value: 'SHA-256' },
] as const;

export function NetworkStats({ totalDocuments, totalCreators }: NetworkStatsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const docCount = useCountUp(totalDocuments || 0, 2000, inView);
  const userCount = useCountUp(totalCreators || 0, 2000, inView);

  function getDisplayValue(key: string): string | number {
    switch (key) {
      case 'totalDocuments': return docCount || '--';
      case 'totalCreators': return userCount || '--';
      case 'finality': return '~400ms';
      case 'algorithm': return 'SHA-256';
      default: return '--';
    }
  }

  return (
    <div className="stats-grid" ref={ref}>
      {stats.map((stat) => (
        <div key={stat.key} className="stat-card">
          <div className="stat-number">{getDisplayValue(stat.key)}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
