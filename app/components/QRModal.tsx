'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { bytesToHex } from '@/lib/crypto';
import { showToast } from './Toast';

interface QRModalProps {
  hash: Uint8Array;
  onClose: () => void;
}

export function QRModal({ hash, onClose }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hashHex = bytesToHex(hash);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, hashHex, {
        width: 200,
        margin: 2,
        color: {
          dark: '#e6edf3',
          light: '#05080f',
        },
      });
    }
  }, [hashHex]);

  const copyHash = () => {
    navigator.clipboard.writeText(hashHex);
    showToast('Hash copied!', 'success');
  };

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button className="qr-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="qr-modal-header">
          <span>🔐</span>
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
        <button className="qr-copy-btn" onClick={copyHash}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy Hash
        </button>
      </div>
    </div>
  );
}
