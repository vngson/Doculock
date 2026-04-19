'use client';

import { useState, useEffect, useRef } from 'react';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { TrustBadge } from './TrustBadge';
import { calculateSHA256 } from '@/lib/crypto';
import { formatFileSize, getFileIcon } from '@/lib/file';
import { verifyDocument, getDocumentMetadata, findDocumentByName } from '@/lib/doculock';
import { hashFilesSequential, HashResult } from '@/lib/hashWorker';
import { exportToXLS, exportToCSV, exportToJSON, exportToHTML, generateSummary, BatchVerificationResult } from '@/lib/export';
import { exportToPDF } from '@/lib/pdfExport';
import { useSuiClient } from '@mysten/dapp-kit';
import JSZip from 'jszip';

export interface FileVerifierHandle {
  reset: () => void;
}

interface FileVerifierProps {
  initialHash?: string;
}

interface BatchVerificationResultExtended extends BatchVerificationResult {
  id: string;
  processing: boolean;
}

export function FileVerifier({ initialHash }: FileVerifierProps) {
  const suiClient = useSuiClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const [mode, setMode] = useState<'single' | 'batch'>('single');
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

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<BatchVerificationResultExtended[]>([]);
  const [batchIsProcessing, setBatchIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [showExportDropdown, setShowExportDropdown] = useState(false);

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
                timestamp:
  typeof existingFile.timestamp === 'string'
    ? Date.parse(existingFile.timestamp)
    : existingFile.timestamp,
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
    setBatchFiles([]);
    setBatchResults([]);
    setBatchIsProcessing(false);
    setBatchProgress({ current: 0, total: 0, fileName: '' });
    setShowExportDropdown(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const getMimeTypeFromExtension = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const handleBatchFileSelect = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = Array.from(selectedFiles);
    setBatchFiles(newFiles);
    setBatchResults([]);
    setBatchIsProcessing(false);
    setBatchProgress({ current: 0, total: newFiles.length, fileName: '' });
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const extractedFiles: File[] = [];

      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir) {
          const blob = await zipEntry.async('blob');
          const mimeType = getMimeTypeFromExtension(filename);
          const extractedFile = new File([blob], filename, {
            type: mimeType,
          });
          extractedFiles.push(extractedFile);
        }
      }

      if (extractedFiles.length > 0) {
        handleBatchFileSelect(extractedFiles);
      }
    } catch (error) {
      console.error('Error extracting ZIP:', error);
      alert('Failed to extract ZIP file. Please try again.');
    }

    if (zipInputRef.current) {
      zipInputRef.current.value = '';
    }
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBatchFileSelect(e.target.files);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const startBatchVerification = async () => {
    if (batchFiles.length === 0) return;

    setBatchIsProcessing(true);
    const hashResults = new Map<string, HashResult>();

    try {
      const hashes = await hashFilesSequential(batchFiles, (current, total, fileName) => {
        setBatchProgress({ current, total, fileName: `Hashing: ${fileName}` });
      });

      hashes.forEach((value, key) => {
        hashResults.set(key, value);
      });
    } catch (error) {
      console.error('Error hashing files:', error);
      alert('Failed to hash files. Please try again.');
      setBatchIsProcessing(false);
      return;
    }

    const updatedResults: BatchVerificationResultExtended[] = [];

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      const hashResult = hashResults.get(file.name);

      if (!hashResult) {
        updatedResults.push({
          id: `file-${i}-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          hash: '',
          verified: false,
          processing: false,
          errorMessage: 'Failed to calculate hash',
        });
        continue;
      }

      setBatchProgress({ current: i + 1, total: batchFiles.length, fileName: `Verifying: ${file.name}` });

      let verified = false;
      let metadata;
      let error: string | undefined;
      let existingFileWithSameName = null;

      try {
        verified = await verifyDocument(suiClient, hashResult.hash);
        if (verified) {
          metadata = await getDocumentMetadata(suiClient, hashResult.hash);
        } else {
          const existingFile = await findDocumentByName(suiClient, file.name);
          if (existingFile) {
            existingFileWithSameName = {
              file_name: existingFile.file_name,
              file_size: existingFile.file_size,
              mime_type: existingFile.mime_type,
              timestamp: existingFile.timestamp,
              document_hash: existingFile.document_hash,
            };
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Verification failed';
      }

      updatedResults.push({
        id: `file-${i}-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        hash: hashResult.hash,
        verified,
        processing: false,
        timestamp: metadata?.timestamp,
        errorMessage: error,
        existingFileWithSameName,
      });

      setBatchResults([...updatedResults]);
    }

    setBatchIsProcessing(false);
    setBatchProgress({ current: batchFiles.length, total: batchFiles.length, fileName: 'Complete' });
  };

  const handleExport = (format: 'xls' | 'csv' | 'pdf' | 'json' | 'html') => {
    const exportData: BatchVerificationResult[] = batchResults.map(r => ({
      fileName: r.fileName,
      fileSize: r.fileSize,
      hash: r.hash,
      verified: r.verified,
      timestamp: r.timestamp,
      errorMessage: r.errorMessage,
      existingFileWithSameName: r.existingFileWithSameName,
    }));

    const now = new Date();
    const timestamp =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}-` +
      `${String(now.getHours()).padStart(2, '0')}-` +
      `${String(now.getMinutes()).padStart(2, '0')}-` +
      `${String(now.getSeconds()).padStart(2, '0')}`;

    switch (format) {
      case 'xls':
        exportToXLS(exportData, `verification-results-${timestamp}.xls`);
        break;
      case 'csv':
        exportToCSV(exportData, `verification-results-${timestamp}.csv`);
        break;
      case 'pdf':
        exportToPDF(exportData, {
          filename: `verification-results-${timestamp}.pdf`,
          title: 'Batch Document Verification Report',
          includeSummary: true,
        });
        break;
      case 'json':
        exportToJSON(exportData, `verification-results-${timestamp}.json`);
        break;
      case 'html':
        exportToHTML(exportData, `verification-results-${timestamp}.html`);
        break;
    }

    setShowExportDropdown(false);
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

  const batchSummary = generateSummary(batchResults);

  return (
    <div className="tf-card" style={{ maxWidth: '100%', overflow: 'visible' }}>
      <div className="tf-header">
        <div className="tf-icon">{mode === 'single' ? '🔍' : '📁'}</div>
        <div style={{ flex: 1 }}>
          <div className="tf-title">{mode === 'single' ? 'Verify Document' : 'Batch Verification'}</div>
          <div className="tf-subtitle">
            {mode === 'single' ? 'Check if a document exists on-chain' : 'Verify multiple documents at once'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => {
              setMode('single');
              handleReset();
            }}
            className="vf-reset"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: mode === 'single' ? 'rgba(0, 192, 255, 0.2)' : 'transparent',
              borderColor: mode === 'single' ? 'var(--primary)' : 'var(--border)',
            }}
          >
            Single
          </button>
          <button
            onClick={() => {
              setMode('batch');
              handleReset();
            }}
            className="vf-reset"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: mode === 'batch' ? 'rgba(0, 192, 255, 0.2)' : 'transparent',
              borderColor: mode === 'batch' ? 'var(--primary)' : 'var(--border)',
            }}
          >
            Batch
          </button>
        </div>
      </div>

      {mode === 'single' && (
        <>
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
      </>
      )}

      {mode === 'batch' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleBatchFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '' } as any)}
            onChange={handleFolderUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            style={{ display: 'none' }}
          />

          {batchFiles.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
              <button
                className="tf-submit"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Select Files
              </button>

              <button
                className="tf-submit"
                onClick={() => folderInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1.5px solid rgba(99, 102, 241, 0.3)', color: '#6366F1' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                  e.currentTarget.style.borderColor = '#6366F1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Select Folder
              </button>

              <button
                className="tf-submit"
                onClick={() => zipInputRef.current?.click()}
                style={{ width: '100%', justifyContent: 'center', background: 'rgba(245, 158, 11, 0.1)', border: '1.5px solid rgba(245, 158, 11, 0.3)', color: '#F59E0B' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                  e.currentTarget.style.borderColor = '#F59E0B';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 8v13H3V8" />
                  <path d="M1 3h22v5H1z" />
                  <path d="M10 12h4" />
                </svg>
                Upload ZIP Archive
              </button>
            </div>
          )}

          {batchFiles.length > 0 && (
            <>
              {batchIsProcessing && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(0, 192, 255, 0.1)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(0, 192, 255, 0.3)',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                  }}>
                    <div className="tf-spinner" style={{ width: 18, height: 18 }} />
                    <div style={{
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      flex: 1,
                    }}>
                      {batchProgress.fileName || 'Processing...'}
                    </div>
                    <div style={{
                      color: 'var(--text-dim)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}>
                      {batchProgress.current} / {batchProgress.total}
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(0, 192, 255, 0.2)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      height: '100%',
                      background: 'var(--primary)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {!batchIsProcessing && batchResults.length > 0 && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(99, 102, 241, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: batchSummary.contentDiffers > 0
                    ? 'repeat(auto-fit, minmax(100px, 1fr))'
                    : 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Total</div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{batchSummary.total}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Verified</div>
                    <div style={{ color: '#10B981', fontSize: '1.25rem', fontWeight: 700 }}>{batchSummary.verified}</div>
                  </div>
                  {batchSummary.contentDiffers > 0 && (
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Content Differs</div>
                      <div style={{ color: '#F59E0B', fontSize: '1.25rem', fontWeight: 700 }}>{batchSummary.contentDiffers}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Not Found</div>
                    <div style={{ color: '#EF4444', fontSize: '1.25rem', fontWeight: 700 }}>{batchSummary.notFound}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Errors</div>
                    <div style={{ color: '#F59E0B', fontSize: '1.25rem', fontWeight: 700 }}>{batchSummary.errors}</div>
                  </div>
                </div>
              )}

              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid rgba(0, 192, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
              }}>
                {batchFiles.map((file, idx) => {
                  const result = batchResults[idx];
                  const isContentDiffers = result?.hash && !result?.verified && result?.existingFileWithSameName;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderBottom: idx < batchFiles.length - 1 ? '1px solid rgba(0, 192, 255, 0.1)' : 'none',
                        background: result?.verified
                          ? 'rgba(16, 185, 129, 0.05)'
                          : isContentDiffers
                            ? 'rgba(245, 158, 11, 0.05)'
                            : result?.hash && !result?.verified
                              ? 'rgba(239, 68, 68, 0.05)'
                              : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>
                        {getFileIcon(file.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {file.name}
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      {result?.processing && (
                        <div className="tf-spinner" style={{ width: 16, height: 16 }} />
                      )}
                      {result?.hash && !result.processing && (
                        <div style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: result.verified
                            ? 'rgba(16, 185, 129, 0.2)'
                            : isContentDiffers
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color: result.verified
                            ? '#10B981'
                            : isContentDiffers
                              ? '#F59E0B'
                              : '#EF4444',
                        }}>
                          {result.verified ? '✓ Verified' : isContentDiffers ? '⚠️ Content Differs' : '✗ Not Found'}
                        </div>
                      )}
                      {result?.errorMessage && (
                        <div style={{ color: '#F59E0B', fontSize: '0.7rem' }}>
                          ⚠️ Error
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!batchIsProcessing && batchResults.some(r => r.hash && !r.verified && r.existingFileWithSameName) && (
                <div style={{
                  padding: '16px',
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  <div style={{
                    fontWeight: 600,
                    color: '#F59E0B',
                    fontSize: '0.9rem',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Files with Same Name Found - Content Differs
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    The following files have matching names on blockchain but different content:
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {batchResults.map((result, idx) => {
                      if (!result.hash || result.verified || !result.existingFileWithSameName) return null;
                      const file = batchFiles[idx];
                      const bytesCurrent = result.hash.match(/.{1,2}/g) || [];
                      const bytesExisting = result.existingFileWithSameName.document_hash.match(/.{1,2}/g) || [];

                      return (
                        <div key={idx} style={{
                          padding: '12px',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                        }}>
                          <div style={{ marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                            {file.name}
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            marginBottom: '8px',
                          }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                Current File Hash
                              </div>
                              <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.7rem',
                                lineHeight: '1.6',
                                letterSpacing: '0.5px',
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '6px',
                                wordBreak: 'break-all',
                              }}>
                                {bytesCurrent.map((byte, i) => (
                                  <span
                                    key={`curr-${idx}-${i}`}
                                    style={{
                                      color: byte !== bytesExisting[i] ? '#EF4444' : 'var(--text)',
                                      fontWeight: byte !== bytesExisting[i] ? '700' : '400',
                                      fontSize: '0.65rem',
                                      marginRight: '1px',
                                    }}
                                  >
                                    {byte}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                Stored File Hash
                              </div>
                              <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.7rem',
                                lineHeight: '1.6',
                                letterSpacing: '0.5px',
                                padding: '8px 12px',
                                background: 'rgba(16, 185, 129, 0.05)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '6px',
                                wordBreak: 'break-all',
                              }}>
                                {bytesExisting.map((byte, i) => (
                                  <span
                                    key={`stored-${idx}-${i}`}
                                    style={{
                                      color: byte !== bytesCurrent[i] ? '#EF4444' : 'var(--text)',
                                      fontWeight: byte !== bytesCurrent[i] ? '700' : '400',
                                      fontSize: '0.65rem',
                                      marginRight: '1px',
                                    }}
                                  >
                                    {byte}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '8px',
                            padding: '8px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                          }}>
                            <span style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.8rem' }}>
                              Differs by ~{bytesExisting.reduce((acc, byte, i) => acc + (byte !== bytesCurrent[i] ? 4 : 0), 0)} bits
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                              ({bytesExisting.filter((byte, i) => byte !== bytesCurrent[i]).length} / {bytesExisting.length} bytes)
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{ marginBottom: '4px' }}>
                              <strong>Stored file:</strong> {formatFileSize(result.existingFileWithSameName.file_size)}
                              {file.size !== result.existingFileWithSameName.file_size && (
                                <span style={{ color: '#EF4444', marginLeft: '8px' }}>
                                  (current: {formatFileSize(file.size)})
                                </span>
                              )}
                            </div>
                            {result.existingFileWithSameName.timestamp && (
                              <div>
                                <strong>Uploaded:</strong> {(() => {
                                  const date = new Date(result.existingFileWithSameName.timestamp);
                                  return date.toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
                {!batchIsProcessing && batchResults.length === 0 && (
                  <button
                    className="tf-submit"
                    onClick={startBatchVerification}
                    disabled={batchFiles.length === 0}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    Verify All Documents
                  </button>
                )}

                {!batchIsProcessing && batchResults.length > 0 && (
                  <>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        ref={exportButtonRef}
                        className="tf-submit"
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Results
                      </button>

                      {showExportDropdown && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            width: '200px',
                            background: 'var(--surface)',
                            border: '1.5px solid var(--border)',
                            borderRadius: '12px',
                            padding: '8px',
                            zIndex: 9999,
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                          }}
                        >
                          <button
                            onClick={() => handleExport('xls')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: 'var(--text)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>📊</span>
                            Export as Excel
                          </button>
                          <button
                            onClick={() => handleExport('pdf')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: 'var(--text)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>📄</span>
                            Export as PDF
                          </button>
                          <button
                            onClick={() => handleExport('json')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: 'var(--text)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>📋</span>
                            Export as JSON
                          </button>
                          <button
                            onClick={() => handleExport('html')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '10px 12px',
                              border: 'none',
                              borderRadius: '8px',
                              background: 'transparent',
                              color: 'var(--text)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-light)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ fontSize: '1.1rem' }}>🌐</span>
                            Export as HTML
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      className="vf-reset"
                      onClick={handleReset}
                    >
                      Upload New Files
                    </button>
                  </>
                )}

                {batchIsProcessing && (
                  <button
                    className="vf-reset"
                    onClick={handleReset}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
