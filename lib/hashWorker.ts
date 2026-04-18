/**
 * Hash Worker Pool Manager
 * Manages multiple Web Workers for parallel file hashing
 */

export interface FileToHash {
  id: string;
  name: string;
  data: ArrayBuffer;
}

export interface HashResult {
  id: string;
  name: string;
  hash: string;
  error?: string;
}

export interface HashProgress {
  completed: number;
  total: number;
  currentFile?: string;
}

type HashCallback = (result: HashResult, progress: HashProgress) => void;

export class HashWorkerPool {
  private workers: Worker[] = [];
  private maxWorkers: number;
  private queue: FileToHash[] = [];
  private activeWorkers: Set<string> = new Set();
  private results: Map<string, HashResult> = new Map();
  private onProgress?: HashCallback;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    // Create workers
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = await this.createWorker();
      this.workers.push(worker);
    }
  }

  /**
   * Create a new Web Worker
   */
  private async createWorker(): Promise<Worker> {
    // Import the worker code as a blob
    const workerCode = await fetch('/workers/hashWorker.js').then(r => r.text());
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return new Worker(url);
  }

  /**
   * Hash multiple files in parallel
   */
  async hashFiles(
    files: FileToHash[],
    onProgress?: HashCallback
  ): Promise<HashResult[]> {
    this.queue = [...files];
    this.results.clear();
    this.activeWorkers.clear();
    this.onProgress = onProgress;

    // Process queue
    this.processQueue();

    // Wait for all files to complete
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.results.size === files.length) {
          const results = Array.from(this.results.values());
          resolve(results);
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }

  /**
   * Process the file queue
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.activeWorkers.size < this.maxWorkers) {
      const file = this.queue.shift();
      if (!file) break;

      const worker = this.workers[this.activeWorkers.size];
      if (worker) {
        this.hashFile(worker, file);
      }
    }
  }

  /**
   * Hash a single file using a worker
   */
  private hashFile(worker: Worker, file: FileToHash): void {
    this.activeWorkers.add(file.id);

    worker.onmessage = (e: MessageEvent) => {
      const result: HashResult = e.data;
      this.results.set(result.id, result);
      this.activeWorkers.delete(file.id);

      // Notify progress
      if (this.onProgress) {
        this.onProgress(result, {
          completed: this.results.size,
          total: this.results.size + this.queue.length + this.activeWorkers.size,
          currentFile: result.name,
        });
      }

      // Process next file in queue
      this.processQueue();
    };

    worker.onerror = (error) => {
      const errorResult: HashResult = {
        id: file.id,
        name: file.name,
        hash: '',
        error: 'Worker error occurred',
      };
      this.results.set(errorResult.id, errorResult);
      this.activeWorkers.delete(file.id);

      if (this.onProgress) {
        this.onProgress(errorResult, {
          completed: this.results.size,
          total: this.results.size + this.queue.length + this.activeWorkers.size,
          currentFile: file.name,
        });
      }

      this.processQueue();
    };

    worker.postMessage(file);
  }

  /**
   * Cancel all ongoing operations
   */
  cancel(): void {
    this.queue = [];
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.activeWorkers.clear();
  }

  /**
   * Clean up workers
   */
  destroy(): void {
    this.cancel();
  }
}

/**
 * Simple hash function that uses Web Crypto API directly
 * For smaller batches, this is simpler than managing workers
 */
export async function hashFileDirect(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/**
 * Hash multiple files sequentially with progress updates
 */
export async function hashFilesSequential(
  files: File[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Map<string, HashResult>> {
  const results = new Map<string, HashResult>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const hash = await hashFileDirect(file);
      results.set(file.name, { id: file.name, hash, name: file.name });
    } catch (error) {
      results.set(file.name, {
        id: file.name,
        hash: '',
        name: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }
  }

  return results;
}
