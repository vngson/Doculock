/**
 * Comparison utilities for document hash comparison
 */

/**
 * Compare two SHA-256 hashes and calculate differences
 * @param hash1 - First hash (hex string)
 * @param hash2 - Second hash (hex string)
 * @returns Comparison result with statistics
 */
export function compareHashes(hash1: string, hash2: string): {
  areIdentical: boolean;
  byteDifferences: number;
  percentageDiff: number;
  diffPositions: number[];
} {
  if (hash1 === hash2) {
    return {
      areIdentical: true,
      byteDifferences: 0,
      percentageDiff: 0,
      diffPositions: [],
    };
  }

  const bytes1 = hash1.match(/.{1,2}/g) || [];
  const bytes2 = hash2.match(/.{1,2}/g) || [];
  const diffPositions: number[] = [];

  for (let i = 0; i < Math.max(bytes1.length, bytes2.length); i++) {
    if (bytes1[i] !== bytes2[i]) {
      diffPositions.push(i);
    }
  }

  const totalBytes = Math.max(bytes1.length, bytes2.length);
  const percentageDiff = (diffPositions.length / totalBytes) * 100;

  return {
    areIdentical: false,
    byteDifferences: diffPositions.length,
    percentageDiff,
    diffPositions,
  };
}

/**
 * Calculate estimated bit differences based on byte differences
 * (Assuming uniform distribution of bit flips in different bytes)
 * @param byteDiffCount - Number of different bytes
 * @returns Estimated bit differences
 */
export function estimateBitDifferences(byteDiffCount: number): number {
  // On average, a different byte differs by ~4 bits
  return byteDiffCount * 4;
}
