'use client';

import { useState } from 'react';
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { QRModal } from './QRModal';
import { FraudSimulation } from './FraudSimulation';
import { calculateSHA256, hexToBytes } from '@/lib/crypto';
import { formatFileSize } from '@/lib/file';
import { createStoreDocumentTx } from '@/lib/doculock';
import { doculockConfig } from '@/lib/config';

export interface FileUploaderHandle {
  reset: () => void;
}

interface FileUploaderProps {
  onDocumentStored?: (hash: string) => void;
}

export function FileUploader({ onDocumentStored }: FileUploaderProps) {
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string>('');
  const [isStoring, setIsStoring] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [showFraudTest, setShowFraudTest] = useState(false);

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

  const handleReset = () => {
    setSelectedFile(null);
    setHash('');
    setSuccess(false);
    setError('');
    setShowFraudTest(false);
  };

  return (
    <>
      <div className="tf-card">
        <div className="tf-header">
          <div className="tf-icon">📄</div>
          <div>
            <div className="tf-title">Upload Document</div>
            <div className="tf-subtitle">
              Store document hash on Sui blockchain
            </div>
          </div>
        </div>

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
