'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatFileSize } from '@/lib/file';

interface VerifyResult {
  document_hash: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  creator: string;
  timestamp_utc: string | null;
  tx_digest: string | null;
  network: string;
  explorer_url: string | null;
  creator_url: string | null;
}

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const hashParam = params.hash as string;
  const [hashInput, setHashInput] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const verify = async (hash: string) => {
    const clean = hash.toLowerCase().trim().replace(/^0x/, '');
    if (!/^[a-f0-9]{64}$/.test(clean)) {
      setError('Invalid hash format. Expected 64-character hex string.');
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);
    setResult(null);

    try {
      const res = await fetch(`/api/certificate/${clean}`);
      const data = await res.json();

      if (res.status === 404) {
        setNotFound(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to verify document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clean = hashParam?.toLowerCase().trim().replace(/^0x/, '');
    if (clean && /^[a-f0-9]{64}$/.test(clean)) {
      setHashInput(clean);
      verify(clean);
    }
  }, [hashParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hashInput.trim()) {
      router.push(`/verify/${hashInput.trim().replace(/^0x/, '')}`);
    }
  };

  const truncate = (str: string, len: number) =>
    str.length <= len ? str : str.slice(0, len) + '...' + str.slice(-6);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <a href="/" className="cert-back">Back to DocuLock</a>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--sui-blue, #4DA2FF)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Document Verification</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 6 }}>
            Verify a document exists on the Sui blockchain
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            SHA-256 Hash
          </label>
          <input
            type="text"
            className="verify-input"
            placeholder="Enter document hash (64 hex characters)"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            className="verify-btn"
            disabled={loading || !hashInput.trim()}
          >
            {loading ? 'Verifying...' : 'Verify Document'}
          </button>
        </form>

        {error && (
          <div className="verify-result" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ color: 'var(--error)', fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {notFound && (
          <div className="verify-result" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <strong style={{ color: 'var(--error)' }}>Document Not Found</strong>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              This document has not been registered on the blockchain, or the hash is incorrect.
            </p>
            <a href="/" style={{ color: 'var(--sui-blue, #4DA2FF)', fontSize: '0.85rem', marginTop: 8, display: 'inline-block' }}>
              Upload this document to DocuLock
            </a>
          </div>
        )}

        {result && (
          <div className="verify-result" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <strong style={{ color: 'var(--success)' }}>Document Verified</strong>
            </div>

            <div className="cert-fields" style={{ marginBottom: 0 }}>
              <div className="cert-field">
                <span className="cert-field-label">File</span>
                <span className="cert-field-value">{result.file_name}</span>
              </div>
              <div className="cert-field">
                <span className="cert-field-label">Hash</span>
                <span className="cert-field-value cert-hash">{truncate(result.document_hash, 24)}</span>
              </div>
              <div className="cert-field">
                <span className="cert-field-label">Timestamp</span>
                <span className="cert-field-value">{result.timestamp_utc || 'N/A'}</span>
              </div>
              <div className="cert-field">
                <span className="cert-field-label">Size</span>
                <span className="cert-field-value">{formatFileSize(result.file_size)}</span>
              </div>
              {result.creator && (
                <div className="cert-field">
                  <span className="cert-field-label">Creator</span>
                  {result.creator_url ? (
                    <a href={result.creator_url} target="_blank" rel="noopener noreferrer" className="cert-field-value cert-link">
                      {truncate(result.creator, 16)}
                    </a>
                  ) : (
                    <span className="cert-field-value">{truncate(result.creator, 16)}</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              <a href={`/certificate/${result.document_hash}`} className="cert-btn cert-btn--primary" style={{ fontSize: '0.8rem' }}>
                View Certificate
              </a>
              {result.explorer_url && (
                <a href={result.explorer_url} target="_blank" rel="noopener noreferrer" className="cert-btn cert-btn--outline" style={{ fontSize: '0.8rem' }}>
                  View on Explorer
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
