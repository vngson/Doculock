'use client';

import { useState } from 'react';
import { FileDropzone } from './FileDropzone';
import { HashDisplay } from './HashDisplay';
import { showToast } from './Toast';
import { calculateSHA256 } from '@/lib/crypto';
import { compareHashes as compareHashesUtil, estimateBitDifferences } from '@/lib/comparison';
import { formatFileSize, getFileIcon } from '@/lib/file';

interface ComparisonResult {
  areIdentical: boolean;
  byteDifferences: number;
  percentageDiff: number;
  diffPositions: number[];
}

export function DocumentComparison() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [hashA, setHashA] = useState<string>('');
  const [hashB, setHashB] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const handleFileASelect = async (file: File) => {
    setFileA(file);
    setIsCalculating(true);
    setComparisonResult(null);
    try {
      const hash = await calculateSHA256(file);
      setHashA(hash);
    } catch (err) {
      showToast('Failed to calculate hash for File A', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleFileBSelect = async (file: File) => {
    setFileB(file);
    setIsCalculating(true);
    setComparisonResult(null);
    try {
      const hash = await calculateSHA256(file);
      setHashB(hash);
    } catch (err) {
      showToast('Failed to calculate hash for File B', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCompare = () => {
    if (!hashA || !hashB) {
      showToast('Please upload both files first', 'warning');
      return;
    }
    const result = compareHashesUtil(hashA, hashB);
    setComparisonResult(result);

    if (result.areIdentical) {
      showToast('Files are identical!', 'success');
    } else {
      const estimatedBits = estimateBitDifferences(result.byteDifferences);
      showToast(`Files differ by ~${estimatedBits} bits`, 'warning');
    }
  };

  const handleReset = () => {
    setFileA(null);
    setFileB(null);
    setHashA('');
    setHashB('');
    setComparisonResult(null);
  };

  const bytesA = hashA.match(/.{1,2}/g) || [];
  const bytesB = hashB.match(/.{1,2}/g) || [];

  return (
    <div className="tf-card">
      <div className="tf-header">
        <div className="tf-icon">⚖️</div>
        <div>
          <div className="tf-title">Document Comparison</div>
          <div className="tf-subtitle">Compare two files byte-by-byte</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}>
        {/* File A Section */}
        <div className="dc-file-section">
          <div className="tf-label">File A (Original)</div>
          {!fileA && (
            <FileDropzone
              onFileSelect={handleFileASelect}
              accept="application/pdf,image/*,text/plain"
              maxSize={100 * 1024 * 1024}
            />
          )}
          {fileA && (
            <div style={{
              padding: '16px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '2rem' }}>
                  {getFileIcon(fileA.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {fileA.name}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginTop: 2,
                  }}>
                    {formatFileSize(fileA.size)} • {fileA.type}
                  </div>
                </div>
              </div>
              <HashDisplay hash={hashA} label="SHA-256 Hash" />
              <button
                onClick={() => { setFileA(null); setHashA(''); setComparisonResult(null); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#EF4444';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Remove File
              </button>
            </div>
          )}
        </div>

        {/* File B Section */}
        <div className="dc-file-section">
          <div className="tf-label">File B (Compare)</div>
          {!fileB && (
            <FileDropzone
              onFileSelect={handleFileBSelect}
              accept="application/pdf,image/*,text/plain"
              maxSize={100 * 1024 * 1024}
            />
          )}
          {fileB && (
            <div style={{
              padding: '16px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <span style={{ fontSize: '2rem' }}>
                  {getFileIcon(fileB.type)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {fileB.name}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginTop: 2,
                  }}>
                    {formatFileSize(fileB.size)} • {fileB.type}
                  </div>
                </div>
              </div>
              <HashDisplay hash={hashB} label="SHA-256 Hash" />
              <button
                onClick={() => { setFileB(null); setHashB(''); setComparisonResult(null); }}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#EF4444';
                  e.currentTarget.style.color = '#EF4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Remove File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && fileA && fileB && (
        <>
          {/* Metadata Comparison */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}>
              File Metadata Comparison
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* File Name */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                background: fileA.name === fileB.name
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'rgba(239, 68, 68, 0.05)',
                border: fileA.name === fileB.name
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  File Name
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.name === fileB.name ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                      wordBreak: 'break-all',
                    }}>
                      {fileA.name}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.name === fileB.name ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.name === fileB.name
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.name === fileB.name ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                      wordBreak: 'break-all',
                    }}>
                      {fileB.name}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.name === fileB.name ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.name === fileB.name
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                </div>
                {fileA.name !== fileB.name && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#EF4444',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    ⚠️ Filenames differ
                  </div>
                )}
              </div>

              {/* File Size */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                background: fileA.size === fileB.size
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'rgba(239, 68, 68, 0.05)',
                border: fileA.size === fileB.size
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  File Size
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.size === fileB.size ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {formatFileSize(fileA.size)} ({fileA.size} bytes)
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.size === fileB.size ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.size === fileB.size
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.size === fileB.size ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {formatFileSize(fileB.size)} ({fileB.size} bytes)
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.size === fileB.size ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.size === fileB.size
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                </div>
                {fileA.size !== fileB.size && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#EF4444',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    ⚠️ Sizes differ by {Math.abs(fileA.size - fileB.size)} bytes
                  </div>
                )}
              </div>

              {/* File Type */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                background: fileA.type === fileB.type
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'rgba(239, 68, 68, 0.05)',
                border: fileA.type === fileB.type
                  ? '1px solid rgba(16, 185, 129, 0.2)'
                  : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  File Type (MIME)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.type === fileB.type ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {fileA.type}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.type === fileB.type ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.type === fileB.type
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.type === fileB.type ? 'var(--text)' : '#EF4444',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {fileB.type}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.type === fileB.type ? '#10B981' : '#EF4444'} strokeWidth="2">
                      {fileA.type === fileB.type
                        ? <polyline points="20 6 9 17 4 12" />
                        : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                      }
                    </svg>
                  </div>
                </div>
                {fileA.type !== fileB.type && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#EF4444',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    ⚠️ File types differ
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difference Statistics */}
          <div style={{
            padding: '16px',
            background: comparisonResult.areIdentical
              ? 'rgba(16, 185, 129, 0.05)'
              : 'rgba(239, 68, 68, 0.05)',
            border: comparisonResult.areIdentical
              ? '1px solid rgba(16, 185, 129, 0.2)'
              : '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              color: comparisonResult.areIdentical ? '#10B981' : '#EF4444',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              <span>
                {comparisonResult.areIdentical
                  ? 'Files are identical'
                  : `Files differ by ~${estimateBitDifferences(comparisonResult.byteDifferences)} bits`}
              </span>
              <span style={{ opacity: 0.7 }}>
                {comparisonResult.areIdentical ? '100% match' : `${comparisonResult.percentageDiff.toFixed(1)}% difference`}
              </span>
            </div>

            {!comparisonResult.areIdentical && (
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <div style={{
                  flex: 1,
                  height: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${comparisonResult.percentageDiff}%`,
                    height: '100%',
                    background: '#EF4444',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                }}>
                  {comparisonResult.byteDifferences} / {hashA.length / 2} bytes
                </span>
              </div>
            )}
          </div>

          {/* Hash Comparison Visualization */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
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

            {/* File A Hash */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                File A Hash
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                lineHeight: '1.8',
                letterSpacing: '1px',
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '6px',
                wordBreak: 'break-all',
              }}>
                {bytesA.map((byte, i) => (
                  <span
                    key={`a-${i}`}
                    style={{
                      color: byte !== bytesB[i] ? '#EF4444' : 'var(--text)',
                      fontWeight: byte !== bytesB[i] ? '700' : '400',
                      textDecoration: byte !== bytesB[i] ? 'underline' : 'none',
                      marginRight: '2px',
                    }}
                  >
                    {byte}
                  </span>
                ))}
              </div>
            </div>

            {/* File B Hash */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                File B Hash
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                lineHeight: '1.8',
                letterSpacing: '1px',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                wordBreak: 'break-all',
              }}>
                {bytesB.map((byte, i) => (
                  <span
                    key={`b-${i}`}
                    style={{
                      color: byte !== bytesA[i] ? '#EF4444' : 'var(--text)',
                      fontWeight: byte !== bytesA[i] ? '700' : '400',
                      textDecoration: byte !== bytesA[i] ? 'underline' : 'none',
                      marginRight: '2px',
                    }}
                  >
                    {byte}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            padding: '14px',
            background: 'rgba(0, 192, 255, 0.05)',
            border: '1px solid rgba(0, 192, 255, 0.15)',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
          }}>
            <div style={{
              fontWeight: 600,
              color: 'var(--primary)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              How this works
            </div>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>
                SHA-256 hash is calculated from file CONTENT only.
              </strong>{' '}
              Filename, size, and type are metadata. Two files with different names but same content will have the same hash. The hash comparison above shows if the actual file content is identical.
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button
          className="tf-submit"
          onClick={handleCompare}
          disabled={!hashA || !hashB || isCalculating}
        >
          {isCalculating ? (
            <>
              <div className="tf-spinner" />
              Calculating...
            </>
          ) : (
            'Compare Files'
          )}
        </button>
        <button className="vf-reset" onClick={handleReset}>
          Reset
        </button>
      </div>

      {/* Loading indicator */}
      {isCalculating && (
        <div style={{
          padding: '16px',
          background: 'rgba(0, 192, 255, 0.1)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(0, 192, 255, 0.3)',
          marginTop: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div className="tf-spinner" style={{ width: 18, height: 18 }} />
            <div style={{
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}>
              Calculating hash...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
