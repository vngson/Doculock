'use client';

import { useState } from 'react';
import { FileEdit, Ruler } from 'lucide-react';

interface FraudSimulationProps {
  originalHash: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  onReset?: () => void;
}

export function FraudSimulation({
  originalHash,
  fileName,
  fileSize,
  mimeType,
  onReset,
}: FraudSimulationProps) {
  const [simulated, setSimulated] = useState(false);
  const [tamperedHash, setTamperedHash] = useState('');
  const [tamperField, setTamperField] = useState<'name' | 'size'>('name');

  const generateTamperedHash = () => {
    // Generate a different hash that looks realistic
    // In a real scenario, this would be computed from the tampered data
    const hashArray = originalHash.split('');
    const tamperedArray = [...hashArray];

    // Flip about 30-40% of the characters to simulate 97% difference
    const flipCount = Math.floor(hashArray.length * 0.35);
    const positions = new Set<number>();

    while (positions.size < flipCount) {
      const pos = Math.floor(Math.random() * hashArray.length);
      positions.add(pos);
    }

    positions.forEach(pos => {
      const char = hashArray[pos];
      let newChar = char;
      // Flip to a different hex character
      const hexChars = '0123456789abcdef';
      const currentIndex = hexChars.indexOf(char);
      if (currentIndex !== -1) {
        const newIndex = (currentIndex + Math.floor(Math.random() * 15) + 1) % 16;
        newChar = hexChars[newIndex];
      }
      tamperedArray[pos] = newChar;
    });

    return tamperedArray.join('');
  };

  const handleSimulate = (field: 'name' | 'size') => {
    setTamperField(field);
    // For rename: hash stays same (content unchanged)
    // For size change: hash changes (content modified)
    if (field === 'name') {
      setTamperedHash(originalHash); // Same hash = same content
    } else {
      setTamperedHash(generateTamperedHash()); // Different hash = modified content
    }
    setSimulated(true);
  };

  const handleReset = () => {
    setSimulated(false);
    setTamperedHash('');
    onReset?.();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTamperedValue = () => {
    if (tamperField === 'name') {
      return fileName.replace(/\.(pdf|docx|doc|txt|jpg|png)$/i, '_tampered.$1');
    } else {
      // Simulate different file size
      const tamperedSize = Math.floor(fileSize * (Math.random() * 0.5 + 0.75));
      return formatFileSize(tamperedSize);
    }
  };

  const calculateDifference = () => {
    if (!tamperedHash) return 0;
    let diff = 0;
    for (let i = 0; i < originalHash.length; i++) {
      if (originalHash[i] !== tamperedHash[i]) diff++;
    }
    return Math.round((diff / originalHash.length) * 100);
  };

  const difference = calculateDifference();

  return (
    <div style={{
      padding: '20px',
      background: '#FADBD8',
      border: '2px solid #000',
      borderRadius: '12px',
      marginTop: '20px',
      boxShadow: '3px 3px 0px 0px #000',
    }}>
      {!simulated ? (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            color: '#F39C12',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Fraud Detection Test
          </div>

          <p style={{
            color: '#333',
            fontSize: '0.85rem',
            lineHeight: '1.6',
            marginBottom: '16px',
          }}>
            Simulate what happens if someone tries to tamper with this document.
            Even a small change will cause the hash to be completely different.
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <button
              onClick={() => handleSimulate('name')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#FADBD8',
                border: '2px solid #000',
                borderRadius: '12px',
                color: '#E74C3C',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '3px 3px 0px 0px #000',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5B7B1';
                e.currentTarget.style.borderColor = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FADBD8';
                e.currentTarget.style.borderColor = '#000';
              }}
            >
              <FileEdit size={14} /> Simulate Rename
            </button>

            <button
              onClick={() => handleSimulate('size')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#FADBD8',
                border: '2px solid #000',
                borderRadius: '12px',
                color: '#E74C3C',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '3px 3px 0px 0px #000',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5B7B1';
                e.currentTarget.style.borderColor = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FADBD8';
                e.currentTarget.style.borderColor = '#000';
              }}
            >
              <Ruler size={14} /> Simulate Size Change
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            padding: '12px',
            background: tamperField === 'name' ? '#FEF5E7' : '#FADBD8',
            border: '2px solid #000',
            borderRadius: '12px',
            color: tamperField === 'name' ? '#F39C12' : '#E74C3C',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '3px 3px 0px 0px #000',
          }}>
            {tamperField === 'name' ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Different Name, Same Content
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Fraud Detected! Content Modified
              </>
            )}
          </div>

          {/* Hash Comparison */}
          <div style={{
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '3px 3px 0px 0px #000',
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

            <style>{`
              @keyframes hashDiffPop {
                0% {
                  opacity: 0;
                  transform: scale(1.3);
                }
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
              }
              .hash-row {
                display: flex;
                gap: '4px';
                margin-bottom: '8px';
              }
              .hash-byte {
                font-family: 'var(--font-mono)', monospace;
                font-size: '0.75rem';
                padding: '3px 4px';
                border-radius: '3px';
                min-width: '16px';
                text-align: center';
                transition: 'all 0.2s';
              }
            `}</style>

            {/* Original Hash */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}>
              <div style={{
                width: '80px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
              }}>
                Original
              </div>
              <div style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: '#000',
                wordBreak: 'break-all',
                lineHeight: '1.8',
                letterSpacing: '1px',
                background: '#C1F5C9',
                border: '2px solid #000',
                borderRadius: '12px',
                padding: '10px 14px',
              }}>
                {originalHash.match(/.{1,2}/g)?.map((byte, i) => (
                  <span
                    key={`orig-${i}`}
                    style={{
                      display: 'inline-block',
                      margin: '0 1px',
                      color: originalHash[i * 2] !== tamperedHash[i * 2] ||
                             originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                             ? '#E74C3C'
                             : '#000',
                      fontWeight: originalHash[i * 2] !== tamperedHash[i * 2] ||
                                 originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                                 ? '700'
                                 : '400',
                      textDecoration: originalHash[i * 2] !== tamperedHash[i * 2] ||
                                          originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                                          ? 'underline'
                                          : 'none',
                    }}
                  >
                    {byte}
                  </span>
                ))}
              </div>
            </div>

            {/* Tampered Hash */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px',
            }}>
              <div style={{
                width: '80px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#666',
                textTransform: 'uppercase',
              }}>
                Tampered
              </div>
              <div style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                color: '#000',
                wordBreak: 'break-all',
                lineHeight: '1.8',
                letterSpacing: '1px',
                background: '#FADBD8',
                border: '2px solid #000',
                borderRadius: '12px',
                padding: '10px 14px',
              }}>
                {tamperedHash.match(/.{1,2}/g)?.map((byte, i) => (
                  <span
                    key={`tamp-${i}`}
                    style={{
                      display: 'inline-block',
                      margin: '0 1px',
                      color: originalHash[i * 2] !== tamperedHash[i * 2] ||
                             originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                             ? '#E74C3C'
                             : '#000',
                      fontWeight: originalHash[i * 2] !== tamperedHash[i * 2] ||
                                 originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                                 ? '700'
                                 : '400',
                      textDecoration: originalHash[i * 2] !== tamperedHash[i * 2] ||
                                          originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1]
                                          ? 'underline'
                                          : 'none',
                    }}
                  >
                    {byte}
                  </span>
                ))}
              </div>
            </div>

            {/* Difference Stats */}
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: tamperField === 'name' ? '#C1F5C9' : '#FADBD8',
              border: '2px solid #000',
              borderRadius: '12px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                color: tamperField === 'name' ? '#2ECC71' : '#E74C3C',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}>
                <span>Hash Difference: <span style={{ fontSize: '1.2rem', marginLeft: '4px' }}>{difference}%</span></span>
                <span style={{ opacity: 0.7 }}>{tamperField === 'name' ? '0% - Content unchanged' : '97% expected for 1 bit change'}</span>
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}>
                <div style={{
                  flex: 1,
                  height: '8px',
                  background: tamperField === 'name' ? '#C1F5C9' : '#FADBD8',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid #000',
                }}>
                  <div style={{
                    width: `${difference}%`,
                    height: '100%',
                    background: tamperField === 'name' ? '#2ECC71' : '#E74C3C',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: '#666',
                  whiteSpace: 'nowrap',
                }}>
                  {Math.round((originalHash.length / 2) * (difference / 100))} / {originalHash.length / 2} bytes changed
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Comparison */}
          <div style={{
            background: '#fff',
            border: '2px solid #000',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            boxShadow: '3px 3px 0px 0px #000',
          }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}>
              Metadata Comparison
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                background: '#C1F5C9',
                border: '2px solid #000',
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '100px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
                  textTransform: 'uppercase',
                }}>
                  Original
                </div>
                <div style={{
                  flex: 1,
                  fontSize: '0.85rem',
                  color: '#000',
                  wordBreak: 'break-all',
                }}>
                  {tamperField === 'name' ? fileName : `${formatFileSize(fileSize)} (${mimeType})`}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                background: '#FADBD8',
                border: '2px solid #000',
                borderRadius: '12px',
              }}>
                <div style={{
                  width: '100px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#666',
                  textTransform: 'uppercase',
                }}>
                  Tampered
                </div>
                <div style={{
                  flex: 1,
                  fontSize: '0.85rem',
                  color: '#E74C3C',
                  wordBreak: 'break-all',
                }}>
                  {getTamperedValue()}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div style={{
            padding: '14px',
            background: '#C1F5C9',
            border: '2px solid #000',
            borderRadius: '12px',
            fontSize: '0.8rem',
            color: '#333',
            lineHeight: '1.6',
            boxShadow: '3px 3px 0px 0px #000',
          }}>
            <div style={{
              fontWeight: 600,
              color: '#D2FF00',
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
              Why this matters
            </div>
            <p style={{ margin: 0 }}>
              {tamperField === 'name' ? (
                <>
                  <strong style={{ color: '#000' }}>
                    Hash is based on file content, not file name.
                  </strong>{' '}
                  Renaming a file doesn't change its hash because the content
                  remains exactly the same. This is why renaming alone cannot
                  bypass blockchain verification.
                </>
              ) : (
                <>
                  <strong style={{ color: '#000' }}>
                    SHA-256 is designed to be extremely sensitive.
                  </strong>{' '}
                  Changing any bit of file content causes the hash to change
                  completely (avalanche effect). This makes it impossible for someone to
                  modify a document without the change being detected.
                </>
              )}
            </p>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '2px solid #000',
              borderRadius: '12px',
              color: '#333',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '3px 3px 0px 0px #000',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D2FF00';
              e.currentTarget.style.color = '#D2FF00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#000';
              e.currentTarget.style.color = '#333';
            }}
          >
            ↻ Reset & Try Again
          </button>
        </>
      )}
    </div>
  );
}
