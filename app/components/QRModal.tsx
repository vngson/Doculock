'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { bytesToHex } from '@/lib/crypto';
import { showToast } from './Toast';
import { getExplorerTxUrl } from '@/lib/explorer';
import { Shield } from 'lucide-react';

interface QRModalProps {
  hash: Uint8Array;
  txDigest?: string;
  onClose: () => void;
}

export function QRModal({ hash, txDigest, onClose }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hashHex = bytesToHex(hash);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, hashHex, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    }
  }, [hashHex]);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copyHash = () => {
    navigator.clipboard.writeText(hashHex);
    showToast('Hash copied!', 'success');
  };

  return (
    <div className="qr-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="QR Code">
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="qr-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="qr-modal-header">
          <Shield size={18} />
          <span>Document Proof</span>
        </div>
        <div className="qr-canvas-wrap">
          <canvas ref={canvasRef} width="200" height="200" />
        </div>
        <div className="qr-hint">
          Scan to verify this document exists on-chain
        </div>
        <div className="qr-hash-box">
          <code className="qr-hash">{hashHex.slice(0, 32)}...</code>
        </div>
        <button className="qr-copy-btn" onClick={copyHash} aria-label="Copy hash">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Hash
        </button>
        {txDigest && (
          <a
            className="qr-copy-btn"
            href={getExplorerTxUrl(txDigest)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', marginTop: 8 }}
            aria-label="View on Explorer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View on Explorer
          </a>
        )}
      </div>
    </div>
  );
}
