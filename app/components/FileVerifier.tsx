'use client';

import { useState, useEffect } from 'react';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { TrustBadge } from './TrustBadge';
import { calculateSHA256 } from '@/lib/crypto';
import { formatFileSize, getFileIcon } from '@/lib/file';
import { verifyDocument, getDocumentMetadata, findDocumentByName } from '@/lib/doculock';
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
    existingFileWithSameName?: {
      file_name: string;
      file_size: number;
      mime_type: string;
      timestamp?: number;
      document_hash: string;
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
        setResult({ exists, metadata });
      } else {
        // Hash not found - check if a file with the same name exists
        console.log('[FileVerifier] Hash not found, checking for file with same name...');
        if (selectedFile) {
          const existingFile = await findDocumentByName(suiClient, selectedFile.name);
          if (existingFile) {
            console.log('[FileVerifier] Found existing file with same name!');
            console.log('[FileVerifier] Existing file hash:', existingFile.document_hash);
            setResult({
              exists: false,
              existingFileWithSameName: {
                file_name: existingFile.file_name,
                file_size: existingFile.file_size,
                mime_type: existingFile.mime_type,
                timestamp: existingFile.timestamp,
                document_hash: existingFile.document_hash,
              },
            });
          } else {
            console.log('[FileVerifier] No file found with same name');
            setResult({ exists: false });
          }
        } else {
          setResult({ exists: false });
        }
      }
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

    const bytesCurrent = hash.match(/.{1,2}/g) || [];
    const bytesExisting = result.existingFileWithSameName?.document_hash.match(/.{1,2}/g) || [];

    return (
      <div className="vf-result">
        {result.exists ? (
          <>
            <div className="vf-badge vf-badge--ok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Document Verified
            </div>

            {result.metadata && (
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
          </>
        ) : result.existingFileWithSameName ? (
          <>
            <div className="vf-badge vf-badge--fail">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              File Content Differs
            </div>

            <div style={{
              padding: '12px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{
                fontWeight: 600,
                color: '#F59E0B',
                fontSize: '0.9rem',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                File with same name exists but content differs
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                A file named <strong>"{result.existingFileWithSameName.file_name}"</strong> is already stored on the blockchain,
                but the hash doesn't match. This means the file content has been modified.
              </div>
            </div>

            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '12px',
              }}>
                Hash Comparison
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Current File Hash (your upload)
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  lineHeight: '1.8',
                  letterSpacing: '1px',
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  wordBreak: 'break-all',
                }}>
                  {bytesCurrent.map((byte, i) => (
                    <span
                      key={`current-${i}`}
                      style={{
                        color: byte !== bytesExisting[i] ? '#EF4444' : 'var(--text)',
                        fontWeight: byte !== bytesExisting[i] ? '700' : '400',
                        textDecoration: byte !== bytesExisting[i] ? 'underline' : 'none',
                        marginRight: '2px',
                      }}
                    >
                      {byte}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Stored File Hash (on blockchain)
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  lineHeight: '1.8',
                  letterSpacing: '1px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  wordBreak: 'break-all',
                }}>
                  {bytesExisting.map((byte, i) => (
                    <span
                      key={`stored-${i}`}
                      style={{
                        color: byte !== bytesCurrent[i] ? '#EF4444' : 'var(--text)',
                        fontWeight: byte !== bytesCurrent[i] ? '700' : '400',
                        textDecoration: byte !== bytesCurrent[i] ? 'underline' : 'none',
                        marginRight: '2px',
                      }}
                    >
                      {byte}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
              }}>
                <div style={{
                  color: '#EF4444',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  marginBottom: '4px',
                }}>
                  Files differ by ~{bytesExisting.reduce((acc, byte, i) => acc + (byte !== bytesCurrent[i] ? 4 : 0), 0)} bits
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                }}>
                  {bytesExisting.filter((byte, i) => byte !== bytesCurrent[i]).length} / {bytesExisting.length} bytes differ
                </div>
              </div>
            </div>

            <div className="vf-diff">
              <div className="vf-diff-heading">Stored File Details</div>
              <div className="vf-diff-row vf-diff-row--ok">
                <span className="vf-diff-label">File Name</span>
                <span className="vf-diff-value">{result.existingFileWithSameName.file_name}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              <div className="vf-diff-row">
                <span className="vf-diff-label">File Size</span>
                <span className="vf-diff-value">
                  {formatFileSize(result.existingFileWithSameName.file_size)}
                  {selectedFile && selectedFile.size !== result.existingFileWithSameName.file_size && (
                    <span style={{
                      color: '#EF4444',
                      marginLeft: '8px',
                      fontWeight: 600,
                    }}>
                      (yours: {formatFileSize(selectedFile.size)})
                    </span>
                  )}
                </span>
                <span className="vf-diff-icon" style={{ color: selectedFile && selectedFile.size === result.existingFileWithSameName.file_size ? '#10B981' : '#EF4444' }}>
                  {selectedFile && selectedFile.size === result.existingFileWithSameName.file_size ? '✓' : '✗'}
                </span>
              </div>
              <div className="vf-diff-row">
                <span className="vf-diff-label">Type</span>
                <span className="vf-diff-value">{result.existingFileWithSameName.mime_type}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              {result.existingFileWithSameName.timestamp && (
                <div className="vf-diff-row vf-diff-row--ok">
                  <span className="vf-diff-label">Uploaded</span>
                  <span className="vf-diff-value" style={{ fontSize: '0.8rem' }}>
                    {(() => {
                      const date = new Date(result.existingFileWithSameName.timestamp);
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
        ) : (
          <>
            <div className="vf-badge vf-badge--fail">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Document Not Found
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              This document has not been stored on the blockchain yet.
              Upload it first to create an immutable timestamp proof.
            </div>
          </>
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
