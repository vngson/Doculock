'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatFileSize } from '@/lib/file';

interface CertificateData {
  document_hash: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  creator: string;
  timestamp_utc: string | null;
  timestamp_iso: string | null;
  tx_digest: string | null;
  network: string;
  explorer_url: string | null;
  creator_url: string | null;
}

export default function CertificatePage() {
  const params = useParams();
  const hash = params.hash as string;
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/certificate/${hash}`)
      .then(res => res.json())
      .then(res => {
        if (res.error) {
          setError(res.error);
        } else {
          setData(res);
        }
      })
      .catch(() => setError('Failed to load certificate'))
      .finally(() => setLoading(false));
  }, [hash]);

  const copyHash = () => {
    navigator.clipboard.writeText(data?.document_hash || hash);
  };

  const shareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const printCertificate = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="certificate-page">
        <div className="certificate-card">
          <div className="certificate-header">
            <div className="cert-skeleton" style={{ width: 180, height: 28, margin: '0 auto 12px' }} />
            <div className="cert-skeleton" style={{ width: 240, height: 16, margin: '0 auto' }} />
          </div>
          <div className="cert-skeleton" style={{ height: 1, margin: '24px 0' }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0' }}>
              <div className="cert-skeleton" style={{ width: 100, height: 14 }} />
              <div className="cert-skeleton" style={{ width: 160, height: 14 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="certificate-page">
        <div className="certificate-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>?</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Certificate Not Found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{error}</p>
          <a href="/" className="cert-btn cert-btn--outline">Back to DocuLock</a>
        </div>
      </div>
    );
  }

  const truncate = (str: string, len: number) =>
    str.length <= len ? str : str.slice(0, len) + '...' + str.slice(-6);

  return (
    <div className="certificate-page">
      <div className="certificate-card">
        <a href="/" className="cert-back">Back to DocuLock</a>

        <div className="certificate-header">
          <div className="cert-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sui-blue, #4DA2FF)" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1>Certificate of Existence</h1>
          <p className="cert-subtitle">This certifies that the document below was proven to exist on the Sui blockchain</p>
        </div>

        <hr className="certificate-divider" />

        <div className="cert-doc-name">{data!.file_name}</div>
        {data!.timestamp_utc && (
          <div className="cert-timestamp">Proven to exist at: {data!.timestamp_utc}</div>
        )}

        <hr className="certificate-divider" />

        <div className="cert-fields">
          <div className="cert-field">
            <span className="cert-field-label">SHA-256 Hash</span>
            <span className="cert-field-value cert-hash">
              {data!.document_hash}
              <button className="cert-copy-mini" onClick={copyHash} title="Copy hash">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </span>
          </div>
          <div className="cert-field">
            <span className="cert-field-label">File Size</span>
            <span className="cert-field-value">{formatFileSize(data!.file_size)}</span>
          </div>
          <div className="cert-field">
            <span className="cert-field-label">MIME Type</span>
            <span className="cert-field-value">{data!.mime_type}</span>
          </div>
          <div className="cert-field">
            <span className="cert-field-label">Blockchain</span>
            <span className="cert-field-value">Sui {data!.network}</span>
          </div>
          {data!.tx_digest && (
            <div className="cert-field">
              <span className="cert-field-label">TX Digest</span>
              <span className="cert-field-value">
                {truncate(data!.tx_digest, 20)}
              </span>
            </div>
          )}
          {data!.creator && (
            <div className="cert-field">
              <span className="cert-field-label">Creator</span>
              {data!.creator_url ? (
                <a href={data!.creator_url} target="_blank" rel="noopener noreferrer" className="cert-field-value cert-link">
                  {truncate(data!.creator, 16)}
                </a>
              ) : (
                <span className="cert-field-value">{truncate(data!.creator, 16)}</span>
              )}
            </div>
          )}
        </div>

        <div className="cert-actions">
          {data!.explorer_url && (
            <a href={data!.explorer_url} target="_blank" rel="noopener noreferrer" className="cert-btn cert-btn--primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View on Explorer
            </a>
          )}
          <button className="cert-btn cert-btn--outline" onClick={printCertificate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Save as PDF
          </button>
          <button className="cert-btn cert-btn--ghost" onClick={shareUrl}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>

        <hr className="certificate-divider" />
        <div className="cert-footer">Powered by DocuLock on Sui Blockchain</div>
      </div>
    </div>
  );
}
