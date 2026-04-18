interface HashDisplayProps {
  hash: string;
  label?: string;
}

export function HashDisplay({ hash, label = 'SHA-256 Hash' }: HashDisplayProps) {
  const shortHash = hash.length > 32 ? hash.slice(0, 32) + '...' : hash;

  return (
    <div className="tf-hash-box">
      <div className="tf-hash-label">{label}</div>
      <code className="tf-hash-value">{shortHash}</code>
    </div>
  );
}
