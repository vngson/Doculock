'use client';

const stats = [
  { key: 'network', label: 'Network', value: 'Sui' },
  { key: 'security', label: 'Security', value: '256-bit' },
  { key: 'finality', label: 'Finality', value: '~400ms' },
  { key: 'algorithm', label: 'Algorithm', value: 'SHA-256' },
] as const;

export function NetworkStats() {
  return (
    <div className="stats-grid">
      {stats.map((stat) => (
        <div key={stat.key} className="stat-card">
          <div className="stat-number">{stat.value}</div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
