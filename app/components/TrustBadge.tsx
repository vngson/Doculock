interface TrustBadgeProps {
  score: number;
  label?: string;
}

export function TrustBadge({ score, label = 'Trust Score' }: TrustBadgeProps) {
  const isOK = score >= 80;
  const isWarn = score >= 50 && score < 80;

  const badgeClass = isOK ? 'ts-badge--ok' : isWarn ? 'ts-badge--warn' : '';

  const fillClass = isOK ? 'ts-bar-fill--ok' : isWarn ? 'ts-bar-fill--warn' : '';

  return (
    <div className="ts-container">
      <div className="ts-header">
        <span className="ts-label">{label}</span>
        <span className={`ts-badge ${badgeClass}`}>
          {isOK ? 'VERIFIED' : isWarn ? 'PARTIAL' : 'UNVERIFIED'}
        </span>
      </div>
      <div className="ts-bar-track">
        <div className={`ts-bar-fill ${fillClass}`} style={{ width: `${score}%` }} />
      </div>
      <div className="ts-meta">
        <span className="ts-score">{score}%</span>
        <span className="ts-detail">
          {isOK ? 'Fully verified on-chain' : isWarn ? 'Partial verification' : 'Not verified'}
        </span>
      </div>
    </div>
  );
}
