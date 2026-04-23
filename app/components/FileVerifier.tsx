'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Folder, AlertTriangle, FileSpreadsheet, FileText, FileJson, Globe } from 'lucide-react';
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

function HashByteSpan({ byte, isDiff }: { byte: string; isDiff: boolean }) {
  return (
    <span className={`fv-hash-byte ${isDiff ? 'fv-hash-byte--diff' : ''}`}>
      {byte}
    </span>
  );
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

    setIsVerifying(true);

    try {
      const exists = await verifyDocument(suiClient, hashToVerify);

      let metadata;

      if (exists) {
        metadata = await getDocumentMetadata(suiClient, hashToVerify);
        setResult({ exists, metadata });
      } else {
        // Hash not found - check if a file with the same name exists
        if (selectedFile) {
          const existingFile = await findDocumentByName(suiClient, selectedFile.name);
          if (existingFile) {
            const ts = existingFile.timestamp;
            let normalizedTimestamp: number | undefined;

            if (ts == null) {
              normalizedTimestamp = undefined;
            } else if (typeof ts === 'string') {
              // Try parsing the string as a number
              const parsedNum = parseInt(ts, 10);
              if (!isNaN(parsedNum) && parsedNum > 1000000000000) {
                normalizedTimestamp = parsedNum;
              } else if (!isNaN(parsedNum) && parsedNum > 1000000000) {
                normalizedTimestamp = parsedNum * 1000;
              } else {
                // Try parsing as ISO string
                const parsed = Date.parse(ts);
                if (!isNaN(parsed)) {
                  normalizedTimestamp = parsed;
                }
              }
            } else if (typeof ts === 'number') {
              // Check if it's in seconds or milliseconds
              if (ts > 1000000000000) {
                normalizedTimestamp = ts;
              } else if (ts > 1000000000) {
                normalizedTimestamp = ts * 1000;
              }
            }

            setResult({
              exists: false,
              existingFileWithSameName: {
                file_name: existingFile.file_name,
                file_size: existingFile.file_size,
                mime_type: existingFile.mime_type,
                timestamp: normalizedTimestamp,
                document_hash: existingFile.document_hash,
              },
            });
          } else {
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
            const ts = existingFile.timestamp;
            let normalizedTimestamp: number | undefined;

            if (ts == null) {
              normalizedTimestamp = undefined;
            } else if (typeof ts === 'string') {
              const parsedNum = parseInt(ts, 10);
              if (!isNaN(parsedNum) && parsedNum > 1000000000000) {
                normalizedTimestamp = parsedNum;
              } else if (!isNaN(parsedNum) && parsedNum > 1000000000) {
                normalizedTimestamp = parsedNum * 1000;
              } else {
                const parsed = Date.parse(ts);
                if (!isNaN(parsed)) {
                  normalizedTimestamp = parsed;
                }
              }
            } else if (typeof ts === 'number') {
              if (ts > 1000000000000) {
                normalizedTimestamp = ts;
              } else if (ts > 1000000000) {
                normalizedTimestamp = ts * 1000;
              }
            }

            existingFileWithSameName = {
              file_name: existingFile.file_name,
              file_size: existingFile.file_size,
              mime_type: existingFile.mime_type,
              timestamp: normalizedTimestamp,
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
                      <span className="vf-diff-value fv-date-value">
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

            <div className="fv-warn-box">
              <div className="fv-warn-box-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                File with same name exists but content differs
              </div>
              <div className="fv-warn-box-text">
                A file named <strong>"{result.existingFileWithSameName.file_name}"</strong> is already stored on the blockchain,
                but the hash doesn&apos;t match. This means the file content has been modified.
              </div>
            </div>

            <div className="fv-hash-compare-card">
              <div className="fv-hash-compare-heading">
                Hash Comparison
              </div>

              <div className="fv-hash-section">
                <div className="fv-hash-label">
                  Current File Hash (your upload)
                </div>
                <div className="fv-hash-block fv-hash-block--current">
                  {bytesCurrent.map((byte, i) => (
                    <HashByteSpan key={`current-${i}`} byte={byte} isDiff={byte !== bytesExisting[i]} />
                  ))}
                </div>
              </div>

              <div>
                <div className="fv-hash-label">
                  Stored File Hash (on blockchain)
                </div>
                <div className="fv-hash-block fv-hash-block--stored">
                  {bytesExisting.map((byte, i) => (
                    <HashByteSpan key={`stored-${i}`} byte={byte} isDiff={byte !== bytesCurrent[i]} />
                  ))}
                </div>
              </div>

              <div className="fv-diff-stats-box">
                <div className="fv-diff-stats-main">
                  Files differ by ~{bytesExisting.reduce((acc, byte, i) => acc + (byte !== bytesCurrent[i] ? 4 : 0), 0)} bits
                </div>
                <div className="fv-diff-stats-sub">
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
                    <span className="fv-size-diff">
                      (yours: {formatFileSize(selectedFile.size)})
                    </span>
                  )}
                </span>
                <span className={`vf-diff-icon ${selectedFile && selectedFile.size === result.existingFileWithSameName.file_size ? 'fv-diff-icon--ok' : 'fv-diff-icon--fail'}`}>
                  {selectedFile && selectedFile.size === result.existingFileWithSameName.file_size ? '✓' : '✗'}
                </span>
              </div>
              <div className="vf-diff-row">
                <span className="vf-diff-label">Type</span>
                <span className="vf-diff-value">{result.existingFileWithSameName.mime_type}</span>
                <span className="vf-diff-icon">✓</span>
              </div>
              <div className="vf-diff-row">
                <span className="vf-diff-label">Uploaded</span>
                <span className="vf-diff-value fv-date-value">
                  {(() => {
                    const ts = result.existingFileWithSameName.timestamp;

                    if (ts == null) {
                      return 'N/A';
                    }

                    let date: Date;
                    if (typeof ts === 'string') {
                      // Try parsing the string as a number (in case it's a stringified timestamp)
                      const parsedNum = parseInt(ts, 10);
                      if (!isNaN(parsedNum) && parsedNum > 1000000000000) {
                        // It's a timestamp in milliseconds as a string
                        date = new Date(parsedNum);
                      } else if (!isNaN(parsedNum) && parsedNum > 1000000000) {
                        // It's a timestamp in seconds as a string, convert to milliseconds
                        date = new Date(parsedNum * 1000);
                      } else {
                        // Try parsing as an ISO string or date string
                        date = new Date(ts);
                      }
                    } else if (typeof ts === 'number') {
                      // Check if it's in seconds or milliseconds
                      if (ts > 1000000000000) {
                        // Timestamp in milliseconds
                        date = new Date(ts);
                      } else if (ts > 1000000000) {
                        // Timestamp in seconds, convert to milliseconds
                        date = new Date(ts * 1000);
                      } else {
                        // Invalid timestamp
                        return 'N/A';
                      }
                    } else {
                      return 'N/A';
                    }

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
                <span className={`vf-diff-icon ${result.existingFileWithSameName.timestamp ? 'fv-diff-icon--ok' : 'fv-diff-icon--warn'}`}>
                  {result.existingFileWithSameName.timestamp ? '✓' : '?'}
                </span>
              </div>
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
            <div className="fv-not-found-text">
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
      <div className="fv-actions-row">
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
    <div className="tf-card fv-card-full">
      <div className="tf-header">
        <div className="tf-icon">{mode === 'single' ? <Search size={20} /> : <Folder size={20} />}</div>
        <div className="fv-header-text">
          <div className="tf-title">{mode === 'single' ? 'Verify Document' : 'Batch Verification'}</div>
          <div className="tf-subtitle">
            {mode === 'single' ? 'Check if a document exists on-chain' : 'Verify multiple documents at once'}
          </div>
        </div>
        <div className="fv-mode-toggle">
          <button
            onClick={() => {
              setMode('single');
              handleReset();
            }}
            className={`vf-reset fv-mode-btn ${mode === 'single' ? 'fv-mode-btn--active' : ''}`}
          >
            Single
          </button>
          <button
            onClick={() => {
              setMode('batch');
              handleReset();
            }}
            className={`vf-reset fv-mode-btn ${mode === 'batch' ? 'fv-mode-btn--active' : ''}`}
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
          <div className="fv-hash-input">
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
          <div className="tf-input fv-file-display">
            <span className="fv-file-icon">
              {getFileIcon(selectedFile.type)}
            </span>
            <div className="fv-file-info">
              <div className="fv-file-name">
                {selectedFile.name}
              </div>
              <div className="fv-file-meta">
                {formatFileSize(selectedFile.size)} • {selectedFile.type}
              </div>
            </div>
          </div>

          {hash && <HashDisplay hash={hash} />}

          {renderResult()}
          <div className="fv-actions-row">
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
            className="fv-hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '' } as any)}
            onChange={handleFolderUpload}
            className="fv-hidden"
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            className="fv-hidden"
          />

          {batchFiles.length === 0 && (
            <div className="fv-batch-inputs">
              <button
                className="tf-submit fv-batch-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Select Files
              </button>

              <button
                className="tf-submit fv-batch-btn fv-batch-btn--folder"
                onClick={() => folderInputRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Select Folder
              </button>

              <button
                className="tf-submit fv-batch-btn fv-batch-btn--zip"
                onClick={() => zipInputRef.current?.click()}
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
                <div className="fv-batch-progress">
                  <div className="fv-batch-progress-header">
                    <div className="tf-spinner tf-spinner--md" />
                    <div className="fv-batch-progress-label">
                      {batchProgress.fileName || 'Processing...'}
                    </div>
                    <div className="fv-batch-progress-count">
                      {batchProgress.current} / {batchProgress.total}
                    </div>
                  </div>
                  <div className="fv-batch-progress-track">
                    <div
                      className="fv-batch-progress-fill"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {!batchIsProcessing && batchResults.length > 0 && (
                <div className={`fv-batch-summary ${batchSummary.contentDiffers > 0 ? 'fv-batch-summary--with-differs' : ''}`}>
                  <div>
                    <div className="fv-batch-stat-label">Total</div>
                    <div className="fv-batch-stat-value">{batchSummary.total}</div>
                  </div>
                  <div>
                    <div className="fv-batch-stat-label">Verified</div>
                    <div className="fv-batch-stat-value fv-batch-stat-value--verified">{batchSummary.verified}</div>
                  </div>
                  {batchSummary.contentDiffers > 0 && (
                    <div>
                      <div className="fv-batch-stat-label">Content Differs</div>
                      <div className="fv-batch-stat-value fv-batch-stat-value--differs">{batchSummary.contentDiffers}</div>
                    </div>
                  )}
                  <div>
                    <div className="fv-batch-stat-label">Not Found</div>
                    <div className="fv-batch-stat-value fv-batch-stat-value--not-found">{batchSummary.notFound}</div>
                  </div>
                  <div>
                    <div className="fv-batch-stat-label">Errors</div>
                    <div className="fv-batch-stat-value fv-batch-stat-value--errors">{batchSummary.errors}</div>
                  </div>
                </div>
              )}

              <div className="fv-batch-list">
                {batchFiles.map((file, idx) => {
                  const result = batchResults[idx];
                  const isContentDiffers = result?.hash && !result?.verified && result?.existingFileWithSameName;

                  const itemClass = result?.verified
                    ? 'fv-batch-item--verified'
                    : isContentDiffers
                      ? 'fv-batch-item--differs'
                      : result?.hash && !result?.verified
                        ? 'fv-batch-item--not-found'
                        : '';

                  return (
                    <div
                      key={idx}
                      className={`fv-batch-item ${itemClass}`}
                    >
                      <span className="fv-batch-item-icon">
                        {getFileIcon(file.type)}
                      </span>
                      <div className="fv-batch-item-info">
                        <div className="fv-batch-item-name">
                          {file.name}
                        </div>
                        <div className="fv-batch-item-size">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      {result?.processing && (
                        <div className="tf-spinner tf-spinner--sm" />
                      )}
                      {result?.hash && !result.processing && (
                        <div className={`fv-batch-badge ${
                          result.verified
                            ? 'fv-batch-badge--verified'
                            : isContentDiffers
                              ? 'fv-batch-badge--differs'
                              : 'fv-batch-badge--not-found'
                        }`}>
                          {result.verified ? '✓ Verified' : isContentDiffers ? 'Content Differs' : '✗ Not Found'}
                        </div>
                      )}
                      {result?.errorMessage && (
                        <div className="fv-batch-error-label">
                          Error
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!batchIsProcessing && batchResults.some(r => r.hash && !r.verified && r.existingFileWithSameName) && (
                <div className="fv-batch-diff-box">
                  <div className="fv-batch-diff-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Files with Same Name Found - Content Differs
                  </div>
                  <div className="fv-batch-diff-text">
                    The following files have matching names on blockchain but different content:
                  </div>

                  <div className="fv-batch-diff-list">
                    {batchResults.map((result, idx) => {
                      if (!result.hash || result.verified || !result.existingFileWithSameName) return null;
                      const file = batchFiles[idx];
                      const bytesCurrent = result.hash.match(/.{1,2}/g) || [];
                      const bytesExisting = result.existingFileWithSameName.document_hash.match(/.{1,2}/g) || [];

                      return (
                        <div key={idx} className="fv-batch-diff-item">
                          <div className="fv-batch-diff-item-name">
                            {file.name}
                          </div>

                          <div className="fv-batch-diff-hash-grid">
                            <div>
                              <div className="fv-batch-diff-hash-label">
                                Current File Hash
                              </div>
                              <div className="fv-batch-diff-hash-block fv-batch-diff-hash-block--current">
                                {bytesCurrent.map((byte, i) => (
                                  <HashByteSpan
                                    key={`curr-${idx}-${i}`}
                                    byte={byte}
                                    isDiff={byte !== bytesExisting[i]}
                                  />
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="fv-batch-diff-hash-label">
                                Stored File Hash
                              </div>
                              <div className="fv-batch-diff-hash-block fv-batch-diff-hash-block--stored">
                                {bytesExisting.map((byte, i) => (
                                  <HashByteSpan
                                    key={`stored-${idx}-${i}`}
                                    byte={byte}
                                    isDiff={byte !== bytesCurrent[i]}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="fv-batch-diff-stats-row">
                            <span className="fv-batch-diff-bits">
                              Differs by ~{bytesExisting.reduce((acc, byte, i) => acc + (byte !== bytesCurrent[i] ? 4 : 0), 0)} bits
                            </span>
                            <span className="fv-batch-diff-bytes">
                              ({bytesExisting.filter((byte, i) => byte !== bytesCurrent[i]).length} / {bytesExisting.length} bytes)
                            </span>
                          </div>

                          <div className="fv-batch-diff-meta">
                            <div className="fv-batch-diff-meta-row">
                              <strong>Stored file:</strong> {formatFileSize(result.existingFileWithSameName.file_size)}
                              {file.size !== result.existingFileWithSameName.file_size && (
                                <span className="fv-batch-diff-size-diff">
                                  (current: {formatFileSize(file.size)})
                                </span>
                              )}
                            </div>
                            <div>
                              <strong>Uploaded:</strong> {(() => {
                                const ts = result.existingFileWithSameName.timestamp;
                                let date: Date;
                                if (typeof ts === 'string') {
                                  date = new Date(ts);
                                } else if (typeof ts === 'number') {
                                  date = new Date(ts);
                                } else {
                                  return 'N/A';
                                }
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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="fv-batch-actions">
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
                    <div className="fv-export-wrap">
                      <button
                        ref={exportButtonRef}
                        className="tf-submit"
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
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
                          className="fv-export-dropdown"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => handleExport('xls')} className="fv-export-item">
                            <FileSpreadsheet size={16} />
                            Export as Excel
                          </button>
                          <button onClick={() => handleExport('pdf')} className="fv-export-item">
                            <FileText size={16} />
                            Export as PDF
                          </button>
                          <button onClick={() => handleExport('json')} className="fv-export-item">
                            <FileJson size={16} />
                            Export as JSON
                          </button>
                          <button onClick={() => handleExport('html')} className="fv-export-item">
                            <Globe size={16} />
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
