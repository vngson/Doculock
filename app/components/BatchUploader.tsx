'use client';

import { useState, useRef } from 'react';
import { Package } from 'lucide-react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { calculateSHA256, hexToBytes } from '@/lib/crypto';
import { formatFileSize, getFileIcon } from '@/lib/file';
import { createBatchStoreDocumentsTx, DocumentInfo, invalidateDocumentEventsCache } from '@/lib/doculock';
import { doculockConfig } from '@/lib/config';

interface DocumentWithHash {
  file: File;
  hash: string;
  hashBytes: Uint8Array;
  hashError?: string;
}

export function BatchUploader() {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentWithHash[]>([]);
  const [isHashing, setIsHashing] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [results, setResults] = useState<{ fileName: string; status: 'success' | 'error'; message: string }[]>([]);

  const handleFileSelect = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newDocuments: DocumentWithHash[] = [];

    setIsHashing(true);
    setProgress({ current: 0, total: fileArray.length, fileName: '' });
    setSuccess(false);
    setError('');
    setResults([]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setProgress({ current: i + 1, total: fileArray.length, fileName: `Hashing: ${file.name}` });

      try {
        const hashHex = await calculateSHA256(file);
        const hashBytes = hexToBytes(hashHex);

        newDocuments.push({
          file,
          hash: hashHex,
          hashBytes,
        });
      } catch (err) {
        console.error(`Failed to hash ${file.name}:`, err);
        newDocuments.push({
          file,
          hash: '',
          hashBytes: new Uint8Array(),
          hashError: 'Failed to calculate hash',
        });
      }
    }

    setDocuments(newDocuments);
    setIsHashing(false);
    setProgress({ current: fileArray.length, total: fileArray.length, fileName: 'Hashing complete' });
  };

  const handleBatchStore = async () => {
    const validDocuments = documents.filter(d => !d.hashError && d.hash);

    if (validDocuments.length === 0) {
      setError('No valid documents to store');
      return;
    }

    setIsStoring(true);
    setError('');
    setSuccess(false);
    setResults([]);

    try {
      const documentInfos: DocumentInfo[] = validDocuments.map(doc => ({
        fileHash: doc.hashBytes,
        fileName: doc.file.name,
        fileSize: doc.file.size,
        mimeType: doc.file.type,
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
                  options: {
                    showObjectChanges: true,
                    showEffects: true,
                    showEvents: true,
                  },
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

            try {
              await fetch('/api/indexer/sync', { method: 'POST' });
            } catch (syncError) {
              // Don't fail the upload if sync fails
            }

            if (txDetails?.events) {
              const resultsArray: { fileName: string; status: 'success' | 'error'; message: string }[] = [];

              txDetails.events.forEach((event: any) => {
                if (event.type.includes('DocumentStored')) {
                  const parsed = event.parsedJson;
                  const fileName = parsed.file_name;
                  const fileHash = parsed.document_hash;

                  const matchedDoc = validDocuments.find(d => {
                    const docHashHex = Array.from(d.hashBytes)
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('');
                    let eventHash = fileHash;
                    if (Array.isArray(fileHash)) {
                      eventHash = Array.from(fileHash)
                        .map((b: any) => b.toString(16).padStart(2, '0'))
                        .join('');
                    }
                    return docHashHex === eventHash;
                  });

                  if (matchedDoc) {
                    resultsArray.push({
                      fileName,
                      status: 'success',
                      message: 'Successfully stored on blockchain',
                    });
                  }
                }
              });

              validDocuments.forEach(doc => {
                const successResult = resultsArray.find(r => r.fileName === doc.file.name);
                if (!successResult) {
                  resultsArray.push({
                    fileName: doc.file.name,
                    status: 'error',
                    message: 'Document not found in transaction results',
                  });
                }
              });

              setResults(resultsArray);
            }

            invalidateDocumentEventsCache();
            setSuccess(true);
          },
          onError: (error) => {
            console.error('[BatchUploader] Transaction error:', error);
            setError(`Failed to store documents: ${error.message || 'Unknown error'}`);
            setIsStoring(false);
          },
        },
      );
    } catch (err) {
      setError('Failed to store documents. Please try again.');
      console.error(err);
      setIsStoring(false);
    } finally {
      setIsStoring(false);
    }
  };

  const handleReset = () => {
    setDocuments([]);
    setIsHashing(false);
    setIsStoring(false);
    setSuccess(false);
    setError('');
    setProgress({ current: 0, total: 0, fileName: '' });
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validDocumentCount = documents.filter(d => !d.hashError && d.hash).length;
  const errorDocumentCount = documents.filter(d => d.hashError).length;

  return (
    <div className="tf-card">
      <div className="tf-header">
        <div className="tf-icon"><Package size={20} /></div>
        <div>
          <div className="tf-title">Batch Document Upload</div>
          <div className="tf-subtitle">
            Store multiple documents on-chain in one transaction
          </div>
        </div>
      </div>

      {documents.length === 0 && (
        <div className="bu-select-area">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="bu-hidden"
          />

          <button
            className="tf-submit bu-submit-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Select Multiple Files
          </button>

          <div className="bu-info-box">
            <div className="bu-info-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              PTB Benefits
            </div>
            <ul className="bu-info-list">
              <li>Single transaction for all documents</li>
              <li>Atomic - all succeed or all fail together</li>
              <li>Sign once for multiple files</li>
              <li>Lower total gas cost</li>
            </ul>
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <>
          {/* Progress Bar */}
          {(isHashing || isStoring) && (
            <div className="bu-progress-box">
              <div className="bu-progress-header">
                <div className="tf-spinner bu-progress-spinner" />
                <div className="bu-progress-label">
                  {progress.fileName || 'Processing...'}
                </div>
                <div className="bu-progress-count">
                  {progress.current} / {progress.total}
                </div>
              </div>
              <div className="bu-progress-track">
                <div
                  className="bu-progress-fill"
                  style={{ '--bu-progress': `${(progress.current / progress.total) * 100}%` } as React.CSSProperties}
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {!isHashing && !isStoring && (
            <div className="bu-summary">
              <div>
                <div className="bu-stat-label">Total Files</div>
                <div className="bu-stat-value">{documents.length}</div>
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

          {/* Document List */}
          <div className="bu-list">
            {documents.map((doc, idx) => {
              const result = results.find(r => r.fileName === doc.file.name);

              return (
                <div
                  key={idx}
                  className={`bu-item ${result?.status === 'success' ? 'bu-item--ok' : result?.status === 'error' ? 'bu-item--fail' : ''}`}
                >
                  <span className="bu-item-icon">
                    {getFileIcon(doc.file.type)}
                  </span>
                  <div className="bu-item-info">
                    <div className="bu-item-name">
                      {doc.file.name}
                    </div>
                    <div className="bu-item-meta">
                      {formatFileSize(doc.file.size)}
                      {doc.hash && !isHashing && ` • ${doc.hash.slice(0, 8)}...${doc.hash.slice(-8)}`}
                    </div>
                  </div>
                  {doc.hashError && (
                    <div className="bu-badge bu-badge--fail">
                      Hash Error
                    </div>
                  )}
                  {isHashing && !doc.hash && (
                    <div className="tf-spinner" style={{ width: 16, height: 16 }} />
                  )}
                  {result && (
                    <div className={`bu-badge ${result.status === 'success' ? 'bu-badge--ok' : 'bu-badge--fail'}`}>
                      {result.status === 'success' ? '✓ Stored' : '✗ Failed'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Results Summary */}
          {success && results.length > 0 && (
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
                  <strong style={{ color: 'var(--success)' }}>{results.filter(r => r.status === 'success').length}</strong> successfully stored
                </div>
                {results.filter(r => r.status === 'error').length > 0 && (
                  <div className="bu-complete-stat">
                    <strong style={{ color: 'var(--error)' }}>{results.filter(r => r.status === 'error').length}</strong> failed
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
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

          {/* Actions */}
          <div className="bu-actions">
            {!success && !isStoring && validDocumentCount > 0 && (
              <button
                className="tf-submit"
                onClick={handleBatchStore}
                disabled={isHashing || isStoring}
              >
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
    </div>
  );
}
