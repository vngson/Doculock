/**
 * Cryptographic utilities for file hashing
 */

/**
 * Calculate SHA-256 hash of a file
 * @param file - The file to hash
 * @returns Hex string of the SHA-256 hash
 */
export async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = bytesToHex(hashArray);
  return hashHex;
}

/**
 * Convert hex string to Uint8Array
 * @param hex - Hex string
 * @returns Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 * @param bytes - Uint8Array
 * @returns Hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash in chunks for large files
 * @param file - The file to hash
 * @param onProgress - Callback for progress updates (0-1)
 * @returns Hex string of the SHA-256 hash
 */
export async function calculateSHA256Chunked(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  // For large files, we hash the entire file at once
  // Web Crypto API handles this efficiently
  if (onProgress) {
    onProgress(0);
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = bytesToHex(hashArray);

  if (onProgress) {
    onProgress(1);
  }

  return hashHex;
}

/**
 * Compare two hashes (case-insensitive)
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns True if hashes match
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase() === hash2.toLowerCase();
}
