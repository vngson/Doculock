'use client';

import { useState, useRef } from 'react';
import { FileText, Package } from 'lucide-react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { QRModal } from './QRModal';
import { FraudSimulation } from './FraudSimulation';
import { calculateSHA256, hexToBytes } from '@/lib/crypto';
import { formatFileSize, getFileIcon } from '@/lib/file';
import { createStoreDocumentTx, createBatchStoreDocumentsTx, DocumentInfo, invalidateDocumentEventsCache } from '@/lib/doculock';
import { doculockConfig } from '@/lib/config';

export interface FileUploaderHandle {
  reset: () => void;
}

interface DocumentWithHash {
  file: File;
  hash: string;
  hashBytes: Uint8Array;
  hashError?: string;
}

interface FileUploaderProps {
  onDocumentStored?: (hash: string) => void;
}

export function FileUploader({ onDocumentStored }: FileUploaderProps) {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string>('');
  const [isStoring, setIsStoring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [showFraudTest, setShowFraudTest] = useState(false);
  const [txDigest, setTxDigest] = useState('');

  const [batchDocuments, setBatchDocuments] = useState<DocumentWithHash[]>([]);
  const [isHashing, setIsHashing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [batchResults, setBatchResults] = useState<{ fileName: string; status: 'success' | 'error'; message: string }[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSuccess(false);
    setTxDigest('');
    setError('');
    calculateHash(file);
  };

  const calculateHash = async (file: File) => {
    try {
      const hashHex = await calculateSHA256(file);
      setHash(hashHex);
    } catch (err) {
      setError('Failed to calculate file hash');
      console.error(err);
    }
  };

  const handleStore = async () => {
    if (!selectedFile || !hash) return;

    setIsStoring(true);
    setError('');

    try {
      const hashBytes = hexToBytes(hash);
      const txb = await createStoreDocumentTx(hashBytes, selectedFile.name, selectedFile.size, selectedFile.type);

      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            let txDetails;
            let retries = 0;
            const maxRetries = 10;

            while (retries < maxRetries) {
              try {
                txDetails = await suiClient.getTransactionBlock({
                  digest: result.digest,
                  options: { showObjectChanges: true, showEffects: true },
                });

                if (txDetails.effects?.status?.status === 'success') {
                  break;
                } else {
                  setError('Transaction failed on blockchain');
                  setIsStoring(false);
                  return;
                }
              } catch (err: any) {
                retries++;
                if (retries >= maxRetries) {
                  setError('Transaction confirmation timeout. Please verify on blockchain.');
                  setIsStoring(false);
                  return;
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            try { await fetch('/api/indexer/sync', { method: 'POST' }); } catch {}

            setSuccess(true);
            setTxDigest(result.digest);
            invalidateDocumentEventsCache();
            if (onDocumentStored) onDocumentStored(hash);
          },
          onError: (error) => {
            console.error('[FileUploader] Transaction error:', error);
            setError(`Failed to store document: ${error.message || 'Unknown error'}`);
          },
        },
      );
    } catch (err) {
      setError('Failed to store document. Please try again.');
      console.error(err);
    } finally {
      setIsStoring(false);
    }
  };

  const handleBatchFileSelect = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const newDocuments: DocumentWithHash[] = [];

    setIsHashing(true);
    setBatchProgress({ current: 0, total: fileArray.length, fileName: '' });
    setBatchResults([]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setBatchProgress({ current: i + 1, total: fileArray.length, fileName: `Hashing: ${file.name}` });
      try {
        const hashHex = await calculateSHA256(file);
        const hashBytes = hexToBytes(hashHex);
        newDocuments.push({ file, hash: hashHex, hashBytes });
      } catch (err) {
        console.error(`Failed to hash ${file.name}:`, err);
        newDocuments.push({ file, hash: '', hashBytes: new Uint8Array(), hashError: 'Failed to calculate hash' });
      }
    }

    setBatchDocuments(newDocuments);
    setIsHashing(false);
    setBatchProgress({ current: fileArray.length, total: fileArray.length, fileName: 'Hashing complete' });
  };

  const handleBatchStore = async () => {
    const validDocuments = batchDocuments.filter(d => !d.hashError && d.hash);
    if (validDocuments.length === 0) { setError('No valid documents to store'); return; }

    setIsStoring(true);
    setError('');
    setBatchResults([]);

    try {
      const documentInfos: DocumentInfo[] = validDocuments.map(doc => ({
        fileHash: doc.hashBytes, fileName: doc.file.name, fileSize: doc.file.size, mimeType: doc.file.type,
      }));
      const txb = await createBatchStoreDocumentsTx(documentInfos);

      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            let txDetails;
            let retries = 0;
            const maxRetries = 20;

            while (retries < maxRetries) {
              try {
                txDetails = await suiClient.getTransactionBlock({
                  digest: result.digest,
                  options: { showObjectChanges: true, showEffects: true, showEvents: true },
                });
                if (txDetails.effects?.status?.status === 'success') break;
                else { setError('Transaction failed on blockchain'); setIsStoring(false); return; }
              } catch (err: any) {
                retries++;
                if (retries >= maxRetries) { setError('Transaction confirmation timeout.'); setIsStoring(false); return; }
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            try { await fetch('/api/indexer/sync', { method: 'POST' }); } catch {}

            if (txDetails?.events) {
              const resultsArray: { fileName: string; status: 'success' | 'error'; message: string }[] = [];
              txDetails.events.forEach((event: any) => {
                if (event.type.includes('DocumentStored')) {
                  const parsed = event.parsedJson;
                  const fileName = parsed.file_name;
                  const fileHash = parsed.document_hash;
                  const matchedDoc = validDocuments.find(d => {
                    const docHashHex = Array.from(d.hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
                    let eventHash = fileHash;
                    if (Array.isArray(fileHash)) eventHash = Array.from(fileHash).map((b: any) => b.toString(16).padStart(2, '0')).join('');
                    return docHashHex === eventHash;
                  });
                  if (matchedDoc) resultsArray.push({ fileName, status: 'success', message: 'Successfully stored on blockchain' });
                }
              });
              validDocuments.forEach(doc => {
                if (!resultsArray.find(r => r.fileName === doc.file.name)) {
                  resultsArray.push({ fileName: doc.file.name, status: 'error', message: 'Document not found in transaction results' });
                }
              });
              setBatchResults(resultsArray);
            }

            invalidateDocumentEventsCache();
            setSuccess(true);
            setTxDigest(result.digest);
          },
          onError: (error) => {
            setError(`Failed to store documents: ${error.message || 'Unknown error'}`);
            setIsStoring(false);
          },
        },
      );
    } catch (err) {
      setError('Failed to store documents. Please try again.');
      console.error(err);
    } finally {
      setIsStoring(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setHash('');
    setSuccess(false);
    setError('');
    setShowFraudTest(false);
    setBatchDocuments([]);
    setIsHashing(false);
    setBatchProgress({ current: 0, total: 0, fileName: '' });
    setBatchResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validDocumentCount = batchDocuments.filter(d => !d.hashError && d.hash).length;
  const errorDocumentCount = batchDocuments.filter(d => d.hashError).length;

  return (
    <>
      <div className="tf-card">
        <div className="tf-header">
          <div className="tf-icon">{uploadMode === 'single' ? <FileText size={20} /> : <Package size={20} />}</div>
          <div style={{ flex: 1 }}>
            <div className="tf-title">{uploadMode === 'single' ? 'Upload Document' : 'Batch Upload'}</div>
            <div className="tf-subtitle">
              {uploadMode === 'single' ? 'Store document hash on Sui blockchain' : 'Store multiple documents with PTB'}
            </div>
          </div>
          <div className="fu-mode-group">
            <button
              onClick={() => { setUploadMode('single'); handleReset(); }}
              className={`fu-mode-btn ${uploadMode === 'single' ? 'fu-mode-btn--active' : ''}`}
            >
              Single
            </button>
            <button
              onClick={() => { setUploadMode('batch'); handleReset(); }}
              className={`fu-mode-btn ${uploadMode === 'batch' ? 'fu-mode-btn--active' : ''}`}
            >
              Batch
            </button>
          </div>
        </div>

        {uploadMode === 'single' ? (
          <>
            {!selectedFile && (
              <FileDropzone
                onFileSelect={handleFileSelect}
                accept={doculockConfig.supportedFileTypes.join(',')}
                maxSize={doculockConfig.maxFileSize}
              />
            )}

            {selectedFile && (
              <div className="tf-fields">
                <div className="tf-label">Selected File</div>
                <div className="tf-input fu-file-display">
                  <span className="fu-file-icon">{getFileIcon(selectedFile.type)}</span>
                  <div className="fu-file-info">
                    <div className="fu-file-name">{selectedFile.name}</div>
                    <div className="fu-file-meta">{formatFileSize(selectedFile.size)} • {selectedFile.type}</div>
                  </div>
                </div>

                {hash && <HashDisplay hash={hash} />}

                {isStoring && (
                  <div className="fu-confirming-box">
                    <div className="fu-confirming-header">
                      <div className="tf-spinner fu-confirming-spinner" />
                      <div className="fu-confirming-label">Confirming on blockchain...</div>
                    </div>
                    <p className="fu-confirming-text">
                      Please wait while the transaction is being confirmed. This may take a few seconds.
                    </p>
                  </div>
                )}

                {success && !showFraudTest && (
                  <div className="tf-success">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Document stored successfully on blockchain!
                  </div>
                )}

                {success && !showFraudTest && txDigest && (
                  <a
                    href={`https://testnet.suivision.xyz/txblock/${txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fu-explorer-link"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    View on Explorer
                  </a>
                )}

                {success && !showFraudTest && (
                  <button
                    onClick={() => setShowFraudTest(true)}
                    className="fu-fraud-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Test Fraud Detection
                  </button>
                )}

                {error && (
                  <div className="tf-error">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                {success && selectedFile && showFraudTest && (
                  <FraudSimulation
                    originalHash={hash}
                    fileName={selectedFile.name}
                    fileSize={selectedFile.size}
                    mimeType={selectedFile.type}
                    onReset={() => setShowFraudTest(false)}
                  />
                )}

                <div className="fu-actions">
                  {!success && (
                    <button className="tf-submit" onClick={handleStore} disabled={isStoring || !hash}>
                      {isStoring ? (
                        <><div className="tf-spinner" /> Storing on Blockchain...</>
                      ) : 'Store on Blockchain'}
                    </button>
                  )}
                  <button className="vf-reset" onClick={handleReset}>Reset</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {batchDocuments.length === 0 && (
              <div className="bu-select-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleBatchFileSelect(e.target.files)}
                  className="bu-hidden"
                />
                <button className="tf-submit bu-submit-full" onClick={() => fileInputRef.current?.click()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Select Multiple Files
                </button>

                <div className="fu-batch-info-box">
                  <div className="fu-batch-info-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    PTB Benefits
                  </div>
                  <ul className="fu-batch-info-list">
                    <li>Single transaction for all documents</li>
                    <li>Atomic - all succeed or all fail together</li>
                    <li>Sign once for multiple files</li>
                    <li>Lower total gas cost</li>
                  </ul>
                </div>

                <div className="fu-batch-tip">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Use PTB for efficient batch uploads - all files stored in one atomic transaction
                </div>
              </div>
            )}

            {batchDocuments.length > 0 && (
              <>
                {(isHashing || isStoring) && (
                  <div className="bu-progress-box">
                    <div className="bu-progress-header">
                      <div className="tf-spinner bu-progress-spinner" />
                      <div className="bu-progress-label">{batchProgress.fileName || 'Processing...'}</div>
                      <div className="bu-progress-count">{batchProgress.current} / {batchProgress.total}</div>
                    </div>
                    <div className="fu-batch-progress-track">
                      <div
                        className="fu-batch-progress-fill"
                        style={{ '--fu-progress': `${(batchProgress.current / batchProgress.total) * 100}%` } as React.CSSProperties}
                      />
                    </div>
                  </div>
                )}

                {!isHashing && !isStoring && (
                  <div className="fu-batch-summary">
                    <div>
                      <div className="bu-stat-label">Total Files</div>
                      <div className="bu-stat-value">{batchDocuments.length}</div>
                    </div>
                    <div>
                      <div className="bu-stat-label">Ready to Store</div>
                      <div className="bu-stat-value bu-stat-value--success">{validDocumentCount}</div>
                    </div>
                    {errorDocumentCount > 0 && (
                      <div>
                        <div className="bu-stat-label">Hash Errors</div>
                        <div className="bu-stat-value bu-stat-value--error">{errorDocumentCount}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="fu-batch-list">
                  {batchDocuments.map((doc, idx) => {
                    const result = batchResults.find(r => r.fileName === doc.file.name);
                    return (
                      <div
                        key={idx}
                        className={`bu-item ${result?.status === 'success' ? 'bu-item--ok' : result?.status === 'error' ? 'bu-item--fail' : ''}`}
                      >
                        <span className="bu-item-icon">{getFileIcon(doc.file.type)}</span>
                        <div className="bu-item-info">
                          <div className="bu-item-name">{doc.file.name}</div>
                          <div className="bu-item-meta">
                            {formatFileSize(doc.file.size)}
                            {doc.hash && !isHashing && ` • ${doc.hash.slice(0, 8)}...${doc.hash.slice(-8)}`}
                          </div>
                        </div>
                        {doc.hashError && <div className="bu-badge bu-badge--fail">Hash Error</div>}
                        {isHashing && !doc.hash && <div className="tf-spinner" style={{ width: 16, height: 16 }} />}
                        {result && (
                          <div className={`bu-badge ${result.status === 'success' ? 'bu-badge--ok' : 'bu-badge--fail'}`}>
                            {result.status === 'success' ? '✓ Stored' : '✗ Failed'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {success && batchResults.length > 0 && (
                  <div className="bu-complete-box">
                    <div className="bu-complete-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Batch Upload Complete
                    </div>
                    <div className="bu-complete-stats">
                      <div className="bu-complete-stat">
                        <strong style={{ color: 'var(--success)' }}>{batchResults.filter(r => r.status === 'success').length}</strong> successfully stored
                      </div>
                      {batchResults.filter(r => r.status === 'error').length > 0 && (
                        <div className="bu-complete-stat">
                          <strong style={{ color: 'var(--error)' }}>{batchResults.filter(r => r.status === 'error').length}</strong> failed
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="tf-error" style={{ marginBottom: '16px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="fu-actions-wrap">
                  {!success && !isStoring && validDocumentCount > 0 && (
                    <button className="tf-submit" onClick={handleBatchStore} disabled={isHashing || isStoring}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Store {validDocumentCount} Documents with PTB
                    </button>
                  )}
                  <button className="vf-reset" onClick={handleReset}>
                    {success ? 'Upload New Files' : 'Cancel'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showQR && (
        <QRModal
          hash={hexToBytes(hash)}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
