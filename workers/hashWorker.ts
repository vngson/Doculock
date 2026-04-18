/**
 * Web Worker for parallel file hashing
 * This worker calculates SHA-256 hash of files without blocking the main thread
 */

interface HashRequest {
  fileId: string;
  fileName: string;
  fileData: ArrayBuffer;
}

interface HashResponse {
  fileId: string;
  fileName: string;
  hash: string;
  error?: string;
}

self.onmessage = async (e: MessageEvent<HashRequest>) => {
  const { fileId, fileName, fileData } = e.data;

  try {
    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const response: HashResponse = {
      fileId,
      fileName,
      hash: hashHex,
    };

    self.postMessage(response);
  } catch (error) {
    const response: HashResponse = {
      fileId,
      fileName,
      hash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};
