'use client';

import { useState, useEffect } from 'react';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { TrustBadge } from './TrustBadge';
import { calculateSHA256 } from '@/lib/crypto';
import { formatFileSize, getFileIcon } from '@/lib/file';
import { verifyDocument, getDocumentMetadata } from '@/lib/doculock';
import { useSuiClient } from '@mysten/dapp-kit';

export interface FileVerifierHandle {
  reset: () => void;
}

interface FileVerifierProps {
  initialHash?: string;
}

export function FileVerifier({ initialHash }: FileVerifierProps) {
  const suiClient = useSuiClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string>(initialHash || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    exists: boolean;
    metadata?: {
      file_name: string;
      file_size: number;
      mime_type: string;
      timestamp?: number;
    } | null;
  } | null>(null);

  // Auto-verify when initialHash is provided
  useEffect(() => {
    if (initialHash && !selectedFile && !result) {
      setHash(initialHash);
      handleVerifyWithHash(initialHash);
    }
  }, [initialHash]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    calculateHash(file);
  };

  const calculateHash = async (file: File) => {
    try {
      const hashHex = await calculateSHA256(file);
      setHash(hashHex);
    } catch (err) {
      console.error('Failed to calculate hash:', err);
    }
  };

  const handleVerifyWithHash = async (hashToVerify: string) => {
    if (!hashToVerify) return;

    console.log('[FileVerifier] Verifying hash:', hashToVerify);
    console.log('[FileVerifier] Hash length:', hashToVerify?.length);
    console.log('[FileVerifier] Hash type:', typeof hashToVerify);

    setIsVerifying(true);

    try {
      console.log('[FileVerifier] Calling verifyDocument...');
      const exists = await verifyDocument(suiClient, hashToVerify);
      console.log('[FileVerifier] Verification result:', exists);

      let metadata;

      if (exists) {
        console.log('[FileVerifier] Getting metadata...');
        metadata = await getDocumentMetadata(suiClient, hashToVerify);
        console.log('[FileVerifier] Metadata:', metadata);
      }

      setResult({ exists, metadata });
    } catch (err) {
      console.error('Verification failed:', err);
      setResult({ exists: false });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerify = async () => {
    if (!hash) return;
    await handleVerifyWithHash(hash);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setHash('');
    setResult(null);
  };

  const renderResult = () => {
    if (result === null) return null;

    return (
      <div className="vf-result">
        <div className={`vf-badge ${result.exists ? 'vf-badge--ok' : 'vf-badge--fail'}`}>
          {result.exists ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Document Verified
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Document Not Found
            </>
          )}
        </div>

        {result.exists && result.metadata && (
          <>
            <TrustBadge score={100} label="Authenticity" />

            <div className="vf-diff">
              <div className="vf-diff-heading">Document Details</div>
              <div className="vf-diff-row vf-diff-row--ok">
                <span className="vf-diff-label">File Name</span>
                <span className="vf-diff-value">{result.metadata.file_name}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              <div className="vf-diff-row vf-diff-row--ok">
                <span className="vf-diff-label">File Size</span>
                <span className="vf-diff-value">{formatFileSize(result.metadata.file_size)}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              <div className="vf-diff-row vf-diff-row--ok">
                <span className="vf-diff-label">Type</span>
                <span className="vf-diff-value">{result.metadata.mime_type}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              {result.metadata.timestamp && (
                <div className="vf-diff-row vf-diff-row--ok">
                  <span className="vf-diff-label">Uploaded</span>
                  <span className="vf-diff-value" style={{ fontSize: '0.8rem' }}>
                    {(() => {
                      const date = new Date(result.metadata.timestamp);
                      const isValid = !isNaN(date.getTime());
                      return isValid
                        ? date.toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A';
                    })()}
                  </span>
                  <span className="vf-diff-icon">✓</span>
                </div>
              )}
            </div>
          </>
        )}

        {!result.exists && (
          <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            This document has not been stored on the blockchain yet.
            Upload it first to create an immutable timestamp proof.
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {!result && !isVerifying && (
          <button
            className="tf-submit"
            onClick={handleVerify}
            disabled={!hash}
          >
            Verify on Blockchain
          </button>
        )}
        <button className="vf-reset" onClick={handleReset}>
          {result || selectedFile ? 'Verify Another' : 'Reset'}
        </button>
      </div>
    );
  };

  return (
    <div className="tf-card">
      <div className="tf-header">
        <div className="tf-icon">🔍</div>
        <div>
          <div className="tf-title">Verify Document</div>
          <div className="tf-subtitle">
            Check if a document exists on-chain
          </div>
        </div>
      </div>

      {!selectedFile && !hash && (
        <FileDropzone
          onFileSelect={handleFileSelect}
          accept="application/pdf,image/*,text/plain"
        />
      )}

      {!selectedFile && hash && (
        <div className="tf-fields">
          <div className="tf-label">Document Hash</div>
          <div className="tf-input" style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            wordBreak: 'break-all',
            padding: '12px',
            background: 'rgba(0, 192, 255, 0.05)',
            border: '1px solid rgba(0, 192, 255, 0.2)',
            borderRadius: '8px',
          }}>
            {hash}
          </div>

          <HashDisplay hash={hash} />

          {renderResult()}
          {renderActions()}
        </div>
      )}

      {selectedFile && (
        <div className="tf-fields">
          <div className="tf-label">File to Verify</div>
          <div className="tf-input" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.5rem' }}>
              {getFileIcon(selectedFile.type)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {selectedFile.name}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </div>
            </div>
          </div>

          {hash && <HashDisplay hash={hash} />}

          {renderResult()}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {!result && (
              <button
                className="tf-submit"
                onClick={handleVerify}
                disabled={isVerifying || !hash}
              >
                {isVerifying ? (
                  <>
                    <div className="tf-spinner" />
                    Verifying...
                  </>
                ) : (
                  'Verify on Blockchain'
                )}
              </button>
            )}
            <button className="vf-reset" onClick={handleReset}>
              {result ? 'Verify Another' : 'Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
