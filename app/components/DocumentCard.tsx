'use client';

import { useState } from 'react';
import { formatFileSize, getFileIcon, truncateFilename } from '@/lib/file';
// import { QRModal } from './QRModal';
// import { bytesToHex } from '@/lib/crypto';
import type { DocumentStoredEvent } from '@/lib/doculock';
import { showToast } from './Toast';
import { getExplorerTxUrl } from '@/lib/explorer';

interface DocumentCardProps {
  document: DocumentStoredEvent & { tx_digest?: string };
  onVerify?: (hash: string) => void;
}

export function DocumentCard({ document, onVerify }: DocumentCardProps) {
  // const [showQR, setShowQR] = useState(false);

  const handleVerify = () => {
    if (onVerify) {
      onVerify(document.document_hash);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(document.document_hash);
    showToast('Hash copied!', 'success');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <>
      <div className="dc-card">
        <div className="dc-header">
          <div className="dc-file-icon">{getFileIcon(document.mime_type)}</div>
          <div className="dc-file-info">
            <div className="dc-file-name">
              {truncateFilename(document.file_name)}
            </div>
            <div className="dc-file-meta">
              <span>{formatFileSize(document.file_size)}</span>
              <span>•</span>
              <span>{document.mime_type}</span>
            </div>
          </div>
        </div>
        <div className="dc-hash">
          {document.document_hash.slice(0, 64)}
        </div>
        <div className="dc-actions">
          <button className="dc-btn dc-btn--primary" onClick={handleVerify}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c.46 0 .92.05 1.36.14" />
            </svg>
            Verify
          </button>
          {/* QR Code feature - disabled for demo */}
          {/* <button className="dc-btn" onClick={() => setShowQR(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <path d="M3 14h7v7H3z" />
            </svg>
            QR Code
          </button> */}
          <button className="dc-btn" onClick={handleCopyHash}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </button>
          {document.tx_digest && (
            <a
              className="dc-btn"
              href={getExplorerTxUrl(document.tx_digest)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Explorer
            </a>
          )}
        </div>
      </div>
      {/* {showQR && (
        <QRModal
          hash={new Uint8Array(
            document.document_hash.match(/.{2}/g)?.map(b => parseInt(b, 16)) || []
          )}
          onClose={() => setShowQR(false)}
        />
      )} */}
    </>
  );
}
