'use client';

import { useState } from 'react';
import { Scale } from 'lucide-react';
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

function FileCard({ file, hash, onRemove }: { file: File; hash: string; onRemove: () => void }) {
  return (
    <div className="dc-file-card">
      <div className="dc-file-card-header">
        <span className="dc-file-card-icon">
          {getFileIcon(file.type)}
        </span>
        <div className="dc-file-card-info">
          <div className="dc-file-card-name">
            {file.name}
          </div>
          <div className="dc-file-card-meta">
            {formatFileSize(file.size)} • {file.type}
          </div>
        </div>
      </div>
      <HashDisplay hash={hash} label="SHA-256 Hash" />
      <button onClick={onRemove} className="dc-remove-btn">
        Remove File
      </button>
    </div>
  );
}

function ComparisonFieldGroup({ label, match, valueA, valueB, diffNote }: {
  label: string;
  match: boolean;
  valueA: string;
  valueB: string;
  diffNote?: string;
}) {
  return (
    <div className={`dc-field-group ${match ? 'dc-field-group--ok' : 'dc-field-group--fail'}`}>
      <div className="dc-field-label">{label}</div>
      <div className="dc-field-rows">
        <div className="dc-field-row">
          <span className="dc-field-label-ab">File A:</span>
          <span className={`dc-field-value ${!match ? 'dc-field-value--fail' : ''}`}>
            {valueA}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={match ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
            {match
              ? <polyline points="20 6 9 17 4 12" />
              : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
            }
          </svg>
        </div>
        <div className="dc-field-row">
          <span className="dc-field-label-ab">File B:</span>
          <span className={`dc-field-value ${!match ? 'dc-field-value--fail' : ''}`}>
            {valueB}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={match ? '#2ECC71' : '#E74C3C'} strokeWidth="2">
            {match
              ? <polyline points="20 6 9 17 4 12" />
              : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
            }
          </svg>
        </div>
      </div>
      {diffNote && (
        <div className="dc-diff-note">{diffNote}</div>
      )}
    </div>
  );
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
  const isIdentical = comparisonResult?.areIdentical ?? true;

  return (
    <div className="tf-card">
      <div className="tf-header">
        <div className="tf-icon"><Scale size={20} /></div>
        <div>
          <div className="tf-title">Document Comparison</div>
          <div className="tf-subtitle">Compare two files byte-by-byte</div>
        </div>
      </div>

      <div className="dc-grid">
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
            <FileCard
              file={fileA}
              hash={hashA}
              onRemove={() => { setFileA(null); setHashA(''); setComparisonResult(null); }}
            />
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
            <FileCard
              file={fileB}
              hash={hashB}
              onRemove={() => { setFileB(null); setHashB(''); setComparisonResult(null); }}
            />
          )}
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && fileA && fileB && (
        <>
          {/* Metadata Comparison */}
          <div className="dc-comparison-box">
            <div className="dc-section-heading">
              File Metadata Comparison
            </div>

            <div className="dc-field-list">
              <ComparisonFieldGroup
                label="File Name"
                match={fileA.name === fileB.name}
                valueA={fileA.name}
                valueB={fileB.name}
                diffNote={fileA.name !== fileB.name ? 'Filenames differ' : undefined}
              />

              <ComparisonFieldGroup
                label="File Size"
                match={fileA.size === fileB.size}
                valueA={`${formatFileSize(fileA.size)} (${fileA.size} bytes)`}
                valueB={`${formatFileSize(fileB.size)} (${fileB.size} bytes)`}
                diffNote={fileA.size !== fileB.size ? `Sizes differ by ${Math.abs(fileA.size - fileB.size)} bytes` : undefined}
              />

              <ComparisonFieldGroup
                label="File Type (MIME)"
                match={fileA.type === fileB.type}
                valueA={fileA.type}
                valueB={fileB.type}
                diffNote={fileA.type !== fileB.type ? 'File types differ' : undefined}
              />
            </div>
          </div>

          {/* Difference Statistics */}
          <div className={`dc-stats-box ${isIdentical ? 'dc-stats-box--ok' : 'dc-stats-box--fail'}`}>
            <div className={`dc-stats-header ${isIdentical ? 'dc-stats-header--ok' : 'dc-stats-header--fail'}`}>
              <span>
                {isIdentical
                  ? 'Files are identical'
                  : `Files differ by ~${estimateBitDifferences(comparisonResult.byteDifferences)} bits`}
              </span>
              <span className="dc-stats-header-sub">
                {isIdentical ? '100% match' : `${comparisonResult.percentageDiff.toFixed(1)}% difference`}
              </span>
            </div>

            {!isIdentical && (
              <div className="dc-stats-bar-row">
                <div className="dc-stats-bar-track">
                  <div
                    className="dc-stats-bar-fill"
                    style={{ '--dc-progress': `${comparisonResult.percentageDiff}%` } as React.CSSProperties}
                  />
                </div>
                <span className="dc-stats-bar-label">
                  {comparisonResult.byteDifferences} / {hashA.length / 2} bytes
                </span>
              </div>
            )}
          </div>

          {/* Hash Comparison Visualization */}
          <div className="dc-comparison-box">
            <div className="dc-section-heading">
              Hash Comparison
            </div>

            {/* File A Hash */}
            <div className="dc-hash-comparison">
              <div className="dc-hash-label-row">File A Hash</div>
              <div className="dc-hash-block dc-hash-block--ok">
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
              <div className="dc-hash-label-row">File B Hash</div>
              <div className="dc-hash-block dc-hash-block--fail">
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
          <div className="dc-explanation">
            <div className="dc-explanation-header">
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
      <div className="dc-actions">
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
        <div className="dc-loading-box">
          <div className="dc-loading-header">
            <div className="tf-spinner dc-loading-spinner" />
            <div className="dc-loading-text">
              Calculating hash...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
