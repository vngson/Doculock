'use client';

import { useState } from 'react';
import { Scale, AlertTriangle } from 'lucide-react';
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
        <div className="tf-icon"><Scale size={20} /></div>
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
              background: '#fff',
              border: '2px solid #000',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px 0px #000',
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
                    color: '#333',
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
                  border: '2px solid #000',
                  borderRadius: '12px',
                  color: '#333',
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
                  e.currentTarget.style.borderColor = '#000';
                  e.currentTarget.style.color = '#333';
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
              background: '#fff',
              border: '2px solid #000',
              borderRadius: '12px',
              boxShadow: '3px 3px 0px 0px #000',
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
                    color: '#333',
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
                  border: '2px solid #000',
                  borderRadius: '12px',
                  color: '#333',
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
                  e.currentTarget.style.borderColor = '#000';
                  e.currentTarget.style.color = '#333';
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
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '12px',
            boxShadow: '3px 3px 0px 0px #000',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#666',
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
                  ? '#C1F5C9'
                  : '#FADBD8',
                border: fileA.name === fileB.name
                  ? '2px solid #000'
                  : '2px solid #000',
                borderRadius: '12px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.name === fileB.name ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}>
                      {fileA.name}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.name === fileB.name ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.name === fileB.name ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                    }}>
                      {fileB.name}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.name === fileB.name ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    color: '#E74C3C',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    Filenames differ
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
                  ? '#C1F5C9'
                  : '#FADBD8',
                border: fileA.size === fileB.size
                  ? '2px solid #000'
                  : '2px solid #000',
                borderRadius: '12px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.size === fileB.size ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                    }}>
                      {formatFileSize(fileA.size)} ({fileA.size} bytes)
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.size === fileB.size ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.size === fileB.size ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                    }}>
                      {formatFileSize(fileB.size)} ({fileB.size} bytes)
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.size === fileB.size ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    color: '#E74C3C',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    Sizes differ by {Math.abs(fileA.size - fileB.size)} bytes
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
                  ? '#C1F5C9'
                  : '#FADBD8',
                border: fileA.type === fileB.type
                  ? '2px solid #000'
                  : '2px solid #000',
                borderRadius: '12px',
              }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File A:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.type === fileB.type ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                    }}>
                      {fileA.type}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.type === fileB.type ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    background: '#fff',
                    border: '1px solid #000',
                    borderRadius: '8px',
                  }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', minWidth: '60px' }}>File B:</span>
                    <span style={{
                      flex: 1,
                      fontSize: '0.85rem',
                      color: fileA.type === fileB.type ? '#000' : '#E74C3C',
                      fontFamily: 'monospace',
                    }}>
                      {fileB.type}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={fileA.type === fileB.type ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
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
                    color: '#E74C3C',
                    fontWeight: 600,
                    marginTop: '4px',
                  }}>
                    File types differ
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difference Statistics */}
          <div style={{
            padding: '16px',
            background: comparisonResult.areIdentical
              ? '#C1F5C9'
              : '#FADBD8',
            border: '2px solid #000',
            borderRadius: '12px',
            boxShadow: '3px 3px 0px 0px #000',
            marginBottom: '20px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              color: comparisonResult.areIdentical ? '#2ECC71' : '#E74C3C',
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
                  background: '#FADBD8',
                  border: '1px solid #000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${comparisonResult.percentageDiff}%`,
                    height: '100%',
                    background: '#E74C3C',
                    borderRadius: '8px',
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#666',
                  whiteSpace: 'nowrap',
                }}>
                  {comparisonResult.byteDifferences} / {hashA.length / 2} bytes
                </span>
              </div>
            )}
          </div>

          {/* Hash Comparison Visualization */}
          <div style={{
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '12px',
            boxShadow: '3px 3px 0px 0px #000',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}>
              Hash Comparison
            </div>

            {/* File A Hash */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#333', marginBottom: '8px' }}>
                File A Hash
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: '1.8',
                letterSpacing: '1px',
                padding: '10px 14px',
                background: '#C1F5C9',
                border: '2px solid #000',
                borderRadius: '12px',
                wordBreak: 'break-all',
              }}>
                {bytesA.map((byte, i) => (
                  <span
                    key={`a-${i}`}
                    style={{
                      color: byte !== bytesB[i] ? '#E74C3C' : '#000',
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
              <div style={{ fontSize: '0.75rem', color: '#333', marginBottom: '8px' }}>
                File B Hash
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: '1.8',
                letterSpacing: '1px',
                padding: '10px 14px',
                background: '#FADBD8',
                border: '2px solid #000',
                borderRadius: '12px',
                wordBreak: 'break-all',
              }}>
                {bytesB.map((byte, i) => (
                  <span
                    key={`b-${i}`}
                    style={{
                      color: byte !== bytesA[i] ? '#E74C3C' : '#000',
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
            background: '#C1F5C9',
            border: '2px solid #000',
            borderRadius: '12px',
            boxShadow: '3px 3px 0px 0px #000',
            fontSize: '0.8rem',
            color: '#333',
            lineHeight: '1.6',
          }}>
            <div style={{
              fontWeight: 600,
              color: '#000',
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
              <strong style={{ color: '#000' }}>
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
          background: '#C1F5C9',
          borderRadius: '12px',
          border: '2px solid #000',
          boxShadow: '3px 3px 0px 0px #000',
          marginTop: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div className="tf-spinner" style={{ width: 18, height: 18 }} />
            <div style={{
              color: '#000',
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
