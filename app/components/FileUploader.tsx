'use client';

import { useState, useRef } from 'react';
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

  // Batch mode states
  const [batchDocuments, setBatchDocuments] = useState<DocumentWithHash[]>([]);
  const [isHashing, setIsHashing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [batchResults, setBatchResults] = useState<{ fileName: string; status: 'success' | 'error'; message: string }[]>([]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSuccess(false);
    setError('');
    calculateHash(file);
  };

  const calculateHash = async (file: File) => {
    try {
      const hashHex = await calculateSHA256(file);
      console.log('[FileUploader] Calculated hash:', hashHex);
      console.log('[FileUploader] Hash length:', hashHex?.length);
      console.log('[FileUploader] Hash type:', typeof hashHex);
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
      console.log('[FileUploader] Hash to store:', hash);
      const hashBytes = hexToBytes(hash);
      console.log('[FileUploader] Hash bytes length:', hashBytes.length);
      console.log('[FileUploader] Hash bytes (first 8):', Array.from(hashBytes).slice(0, 8));

      const txb = await createStoreDocumentTx(
        hashBytes,
        selectedFile.name,
        selectedFile.size,
        selectedFile.type,
      );

      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            console.log('[FileUploader] Transaction submitted:', result);
            console.log('[FileUploader] Transaction digest:', result.digest);

            // Wait for transaction to be confirmed
            console.log('[FileUploader] Waiting for transaction confirmation...');
            let txDetails;
            let retries = 0;
            const maxRetries = 10;

            while (retries < maxRetries) {
              try {
                txDetails = await suiClient.getTransactionBlock({
                  digest: result.digest,
                  options: {
                    showObjectChanges: true,
                    showEffects: true,
                  },
                });
                console.log('[FileUploader] Transaction details:', txDetails);
                console.log('[FileUploader] Transaction status:', txDetails.effects?.status);

                // Check if transaction was successful
                if (txDetails.effects?.status?.status === 'success') {
                  console.log('[FileUploader] Transaction confirmed successfully!');
                  break;
                } else {
                  console.error('[FileUploader] Transaction failed:', txDetails.effects?.status);
                  setError('Transaction failed on blockchain');
                  setIsStoring(false);
                  return;
                }
              } catch (err: any) {
                retries++;
                console.log(`[FileUploader] Retry ${retries}/${maxRetries}: Transaction not found yet...`);
                if (retries >= maxRetries) {
                  console.error('[FileUploader] Max retries reached');
                  setError('Transaction confirmation timeout. Please verify on blockchain.');
                  setIsStoring(false);
                  return;
                }
                // Wait 2 seconds before retry
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            setSuccess(true);
            // Invalidate cache to refresh analytics data
            invalidateDocumentEventsCache();
            if (onDocumentStored) {
              onDocumentStored(hash);
            }
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

    setBatchDocuments(newDocuments);
    setIsHashing(false);
    setBatchProgress({ current: fileArray.length, total: fileArray.length, fileName: 'Hashing complete' });
  };

  const handleBatchStore = async () => {
    const validDocuments = batchDocuments.filter(d => !d.hashError && d.hash);

    if (validDocuments.length === 0) {
      setError('No valid documents to store');
      return;
    }

    setIsStoring(true);
    setError('');
    setBatchResults([]);

    try {
      console.log('[FileUploader] Preparing batch store for', validDocuments.length, 'documents');

      // Prepare document info for batch transaction
      const documentInfos: DocumentInfo[] = validDocuments.map(doc => ({
        fileHash: doc.hashBytes,
        fileName: doc.file.name,
        fileSize: doc.file.size,
        mimeType: doc.file.type,
      }));

      // Create batch transaction
      const txb = await createBatchStoreDocumentsTx(documentInfos);

      // Execute transaction
      const result = await signAndExecute(
        { transaction: txb },
        {
          onSuccess: async (result) => {
            console.log('[FileUploader] Transaction submitted:', result);

            // Wait for transaction to be confirmed
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
                  console.log('[FileUploader] Transaction confirmed successfully!');
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

            // Parse events to get results for each document
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

              setBatchResults(resultsArray);
            }

            // Invalidate cache to refresh analytics data
            invalidateDocumentEventsCache();

            setSuccess(true);
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
          <div className="tf-icon">{uploadMode === 'single' ? '📄' : '📦'}</div>
          <div style={{ flex: 1 }}>
            <div className="tf-title">{uploadMode === 'single' ? 'Upload Document' : 'Batch Upload'}</div>
            <div className="tf-subtitle">
              {uploadMode === 'single' ? 'Store document hash on Sui blockchain' : 'Store multiple documents with PTB'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              onClick={() => {
                setUploadMode('single');
                handleReset();
              }}
              className="vf-reset"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: uploadMode === 'single' ? 'rgba(0, 192, 255, 0.2)' : 'transparent',
                borderColor: uploadMode === 'single' ? 'var(--primary)' : 'var(--border)',
              }}
            >
              Single
            </button>
            <button
              onClick={() => {
                setUploadMode('batch');
                handleReset();
              }}
              className="vf-reset"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                background: uploadMode === 'batch' ? 'rgba(0, 192, 255, 0.2)' : 'transparent',
                borderColor: uploadMode === 'batch' ? 'var(--primary)' : 'var(--border)',
              }}
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
                <div className="tf-input" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                }}>
                  <span style={{ fontSize: '2rem' }}>
                    {selectedFile.type.includes('pdf') ? '📄' :
                     selectedFile.type.includes('image') ? '🖼️' :
                     selectedFile.type.includes('text') ? '📝' : '📁'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {selectedFile.name}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>
                      {formatFileSize(selectedFile.size)} • {selectedFile.type}
                    </div>
                  </div>
                </div>

                {hash && <HashDisplay hash={hash} />}

                {isStoring && (
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
                      }}>
                        Confirming on blockchain...
                      </div>
                    </div>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      margin: 0,
                      lineHeight: '1.5',
                    }}>
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

                {success && !showFraudTest && (
                  <button
                    onClick={() => setShowFraudTest(true)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1.5px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      color: '#F59E0B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
                      e.currentTarget.style.borderColor = '#F59E0B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                    }}
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

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  {!success && (
                    <button
                      className="tf-submit"
                      onClick={handleStore}
                      disabled={isStoring || !hash}
                    >
                      {isStoring ? (
                        <>
                          <div className="tf-spinner" />
                          Storing on Blockchain...
                        </>
                      ) : (
                        'Store on Blockchain'
                      )}
                    </button>
                  )}
                  <button className="vf-reset" onClick={handleReset}>
                    Reset
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {batchDocuments.length === 0 && (
              <div style={{ padding: '20px 0' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleBatchFileSelect(e.target.files)}
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
                  Select Multiple Files
                </button>

                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                    color: '#6366F1',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    PTB Benefits
                  </div>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '24px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                  }}>
                    <li>Single transaction for all documents</li>
                    <li>Atomic - all succeed or all fail together</li>
                    <li>Sign once for multiple files</li>
                    <li>Lower total gas cost</li>
                  </ul>
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  Use PTB for efficient batch uploads - all files stored in one atomic transaction
                </div>
              </div>
            )}

            {batchDocuments.length > 0 && (
              <>
                {/* Progress Bar */}
                {(isHashing || isStoring) && (
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

                {/* Summary */}
                {!isHashing && !isStoring && (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(99, 102, 241, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    marginBottom: '16px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                  }}>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Total Files</div>
                      <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>{batchDocuments.length}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Ready to Store</div>
                      <div style={{ color: '#10B981', fontSize: '1.25rem', fontWeight: 700 }}>{validDocumentCount}</div>
                    </div>
                    {errorDocumentCount > 0 && (
                      <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600 }}>Hash Errors</div>
                        <div style={{ color: '#EF4444', fontSize: '1.25rem', fontWeight: 700 }}>{errorDocumentCount}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document List */}
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid rgba(0, 192, 255, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px',
                }}>
                  {batchDocuments.map((doc, idx) => {
                    const result = batchResults.find(r => r.fileName === doc.file.name);

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: idx < batchDocuments.length - 1 ? '1px solid rgba(0, 192, 255, 0.1)' : 'none',
                          background: result?.status === 'success'
                            ? 'rgba(16, 185, 129, 0.05)'
                            : result?.status === 'error'
                              ? 'rgba(239, 68, 68, 0.05)'
                              : 'transparent',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>
                          {getFileIcon(doc.file.type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {doc.file.name}
                          </div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                            {formatFileSize(doc.file.size)}
                            {doc.hash && !isHashing && ` • ${doc.hash.slice(0, 8)}...${doc.hash.slice(-8)}`}
                          </div>
                        </div>
                        {doc.hashError && (
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                          }}>
                            Hash Error
                          </div>
                        )}
                        {isHashing && !doc.hash && (
                          <div className="tf-spinner" style={{ width: 16, height: 16 }} />
                        )}
                        {result && (
                          <div style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: result.status === 'success'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                            color: result.status === 'success' ? '#10B981' : '#EF4444',
                          }}>
                            {result.status === 'success' ? '✓ Stored' : '✗ Failed'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Results Summary */}
                {success && batchResults.length > 0 && (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#10B981',
                      fontSize: '0.9rem',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      Batch Upload Complete
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: '#10B981' }}>{batchResults.filter(r => r.status === 'success').length}</strong> successfully stored
                      </div>
                      {batchResults.filter(r => r.status === 'error').length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#EF4444' }}>{batchResults.filter(r => r.status === 'error').length}</strong> failed
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

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
