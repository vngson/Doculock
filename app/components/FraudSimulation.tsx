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
    const hashArray = originalHash.split('');
    const tamperedArray = [...hashArray];

    const flipCount = Math.floor(hashArray.length * 0.35);
    const positions = new Set<number>();

    while (positions.size < flipCount) {
      const pos = Math.floor(Math.random() * hashArray.length);
      positions.add(pos);
    }

    positions.forEach(pos => {
      const char = hashArray[pos];
      let newChar = char;
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
    if (field === 'name') {
      setTamperedHash(originalHash);
    } else {
      setTamperedHash(generateTamperedHash());
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
  const isOk = tamperField === 'name';

  return (
    <div className="fs-container">
      {!simulated ? (
        <>
          <div className="fs-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Fraud Detection Test
          </div>

          <p className="fs-description">
            Simulate what happens if someone tries to tamper with this document.
            Even a small change will cause the hash to be completely different.
          </p>

          <div className="fs-btn-group">
            <button
              onClick={() => handleSimulate('name')}
              className="fs-btn"
            >
              <FileEdit size={14} /> Simulate Rename
            </button>

            <button
              onClick={() => handleSimulate('size')}
              className="fs-btn"
            >
              <Ruler size={14} /> Simulate Size Change
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`fs-result-banner ${isOk ? 'fs-result-banner--warn' : 'fs-result-banner--fail'}`}>
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
          <div className="fs-card">
            <div className="fs-section-heading">
              Hash Comparison
            </div>

            {/* Original Hash */}
            <div className="fs-hash-row">
              <div className="fs-hash-label">
                Original
              </div>
              <div className="fs-hash-block fs-hash-block--original">
                {originalHash.match(/.{1,2}/g)?.map((byte, i) => {
                  const isDiff = originalHash[i * 2] !== tamperedHash[i * 2] ||
                                 originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1];
                  return (
                    <span
                      key={`orig-${i}`}
                      className={`fv-hash-byte ${isDiff ? 'fv-hash-byte--diff' : ''}`}
                    >
                      {byte}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Tampered Hash */}
            <div className="fs-hash-row">
              <div className="fs-hash-label">
                Tampered
              </div>
              <div className="fs-hash-block fs-hash-block--tampered">
                {tamperedHash.match(/.{1,2}/g)?.map((byte, i) => {
                  const isDiff = originalHash[i * 2] !== tamperedHash[i * 2] ||
                                 originalHash[i * 2 + 1] !== tamperedHash[i * 2 + 1];
                  return (
                    <span
                      key={`tamp-${i}`}
                      className={`fv-hash-byte ${isDiff ? 'fv-hash-byte--diff' : ''}`}
                    >
                      {byte}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Difference Stats */}
            <div className={`fs-diff-stats ${isOk ? 'fs-diff-stats--ok' : 'fs-diff-stats--fail'}`}>
              <div className={`fs-diff-stats-header ${isOk ? 'fs-diff-stats-header--ok' : 'fs-diff-stats-header--fail'}`}>
                <span>Hash Difference: <span className="fs-diff-stats-pct">{difference}%</span></span>
                <span className="fs-diff-stats-sub">{tamperField === 'name' ? '0% - Content unchanged' : '97% expected for 1 bit change'}</span>
              </div>
              <div className="fs-diff-bar-row">
                <div className={`fs-diff-bar-track ${isOk ? 'fs-diff-bar-track--ok' : 'fs-diff-bar-track--fail'}`}>
                  <div
                    className={`fs-diff-bar-fill ${isOk ? 'fs-diff-bar-fill--ok' : 'fs-diff-bar-fill--fail'}`}
                    style={{ '--diff-width': `${difference}%` } as React.CSSProperties}
                  />
                </div>
                <span className="fs-diff-bar-label">
                  {Math.round((originalHash.length / 2) * (difference / 100))} / {originalHash.length / 2} bytes changed
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Comparison */}
          <div className="fs-card">
            <div className="fs-section-heading">
              Metadata Comparison
            </div>

            <div className="fs-meta-list">
              <div className="fs-meta-row fs-meta-row--ok">
                <div className="fs-meta-label">
                  Original
                </div>
                <div className="fs-meta-value">
                  {tamperField === 'name' ? fileName : `${formatFileSize(fileSize)} (${mimeType})`}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="fs-meta-row fs-meta-row--fail">
                <div className="fs-meta-label">
                  Tampered
                </div>
                <div className="fs-meta-value fs-meta-value--fail">
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
          <div className="fs-explanation">
            <div className="fs-explanation-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              Why this matters
            </div>
            <p className="fv-explanation-text">
              {tamperField === 'name' ? (
                <>
                  <strong className="fv-explanation-strong">
                    Hash is based on file content, not file name.
                  </strong>{' '}
                  Renaming a file doesn&apos;t change its hash because the content
                  remains exactly the same. This is why renaming alone cannot
                  bypass blockchain verification.
                </>
              ) : (
                <>
                  <strong className="fv-explanation-strong">
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
            className="fs-reset-btn"
          >
            ↻ Reset & Try Again
          </button>
        </>
      )}
    </div>
  );
}
