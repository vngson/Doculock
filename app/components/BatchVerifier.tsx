'use client';

import { useState, useRef } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import JSZip from 'jszip';
import { verifyDocument, getDocumentMetadata } from '@/lib/doculock';
import { hashFilesSequential, HashResult } from '@/lib/hashWorker';
import { exportToCSV, exportToJSON, generateSummary, BatchVerificationResult } from '@/lib/export';
import { exportToPDF } from '@/lib/pdfExport';
import { formatFileSize, getFileIcon } from '@/lib/file';

export interface BatchVerificationResultExtended extends BatchVerificationResult {
  id: string;
  processing: boolean;
}

export function BatchVerifier() {
  const suiClient = useSuiClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchVerificationResultExtended[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleFileSelect = (selectedFiles: FileList | File[] | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = Array.from(selectedFiles);
    setFiles(newFiles);
    setResults([]);
    setIsProcessing(false);
    setProgress({ current: 0, total: newFiles.length, fileName: '' });
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
        handleFileSelect(extractedFiles);
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
    handleFileSelect(e.target.files);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const startVerification = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const hashResults = new Map<string, HashResult>();

    try {
      const hashes = await hashFilesSequential(files, (current, total, fileName) => {
        setProgress({ current, total, fileName: `Hashing: ${fileName}` });
      });

      hashes.forEach((value, key) => {
        hashResults.set(key, value);
      });
    } catch (error) {
      console.error('Error hashing files:', error);
      alert('Failed to hash files. Please try again.');
      setIsProcessing(false);
      return;
    }

    // Phase 2: Verify each hash on blockchain
    const updatedResults: BatchVerificationResultExtended[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

      setProgress({ current: i + 1, total: files.length, fileName: `Verifying: ${file.name}` });

      let verified = false;
      let metadata;
      let error: string | undefined;

      try {
        console.log('[BatchVerifier] Calling verifyDocument with hash:', hashResult.hash);
        verified = await verifyDocument(suiClient, hashResult.hash);
        if (verified) {
          metadata = await getDocumentMetadata(suiClient, hashResult.hash);
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Verification failed';
        console.error('[BatchVerifier] Verification error:', err);
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
      });

      // Update results incrementally
      setResults([...updatedResults]);
    }

    setIsProcessing(false);
    setProgress({ current: files.length, total: files.length, fileName: 'Complete' });
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    const exportData: BatchVerificationResult[] = results.map(r => ({
      fileName: r.fileName,
      fileSize: r.fileSize,
      hash: r.hash,
      verified: r.verified,
      timestamp: r.timestamp,
      errorMessage: r.errorMessage,
    }));

    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
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
    }

    setShowExportDropdown(false);
  };

  const handleReset = () => {
    setFiles([]);
    setResults([]);
    setIsProcessing(false);
    setProgress({ current: 0, total: 0, fileName: '' });
    setShowExportDropdown(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  const summary = generateSummary(results);

  return (
    <div className="tf-card" style={{ maxWidth: '100%', overflow: 'visible' }}>
      <div className="tf-header">
        <div className="tf-icon">📁</div>
        <div>
          <div className="tf-title">Batch Document Verification</div>
          <div className="tf-subtitle">
            Verify multiple documents at once
          </div>
        </div>
      </div>

      {/* Upload Options */}
      {files.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
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

      {/* Files List */}
      {files.length > 0 && (
        <>
          {/* Progress Bar */}
          {isProcessing && (
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
                  {progress.fileName || 'Processing...'}
                </div>
                <div style={{
                  color: 'var(--text-dim)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  {progress.current} / {progress.total}
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
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {/* Summary */}
          {!isProcessing && results.length > 0 && (
            <div style={{
              padding: '16px',
              background: 'rgba(99, 102, 241, 0.05)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              marginBottom: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '12px',
            }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Total</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{summary.total}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Verified</div>
                <div style={{ color: '#10B981', fontSize: '1.25rem', fontWeight: 700 }}>{summary.verified}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Not Found</div>
                <div style={{ color: '#EF4444', fontSize: '1.25rem', fontWeight: 700 }}>{summary.notFound}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Errors</div>
                <div style={{ color: '#F59E0B', fontSize: '1.25rem', fontWeight: 700 }}>{summary.errors}</div>
              </div>
            </div>
          )}

          {/* File List */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid rgba(0, 192, 255, 0.2)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
          }}>
            {files.map((file, idx) => {
              if (!file) return null;
              const result = results[idx];
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: idx < files.length - 1 ? '1px solid rgba(0, 192, 255, 0.1)' : 'none',
                    background: result?.verified ? 'rgba(16, 185, 129, 0.05)' : result?.hash && !result?.verified ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
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
                      background: result.verified ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: result.verified ? '#10B981' : '#EF4444',
                    }}>
                      {result.verified ? '✓ Verified' : '✗ Not Found'}
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
            {!isProcessing && results.length === 0 && (
              <button
                className="tf-submit"
                onClick={startVerification}
                disabled={files.length === 0}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Verify All Documents
              </button>
            )}

            {!isProcessing && results.length > 0 && (
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

                  {/* Export Dropdown */}
                  {showExportDropdown && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '180px',
                        background: 'var(--surface)',
                        border: '1.5px solid var(--border)',
                        borderRadius: '12px',
                        padding: '8px',
                        zIndex: 9999,
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                        animation: 'fadeIn 0.2s ease-out',
                      }}
                    >
                      <button
                        onClick={() => handleExport('csv')}
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
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📊</span>
                        Export as CSV
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
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
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
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📋</span>
                        Export as JSON
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

            {isProcessing && (
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
    </div>
  );
}
