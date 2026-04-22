/**
 * DocuLock smart contract interaction utilities
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { doculockConfig, getRegistryId } from './config';
import { bytesToHex } from './crypto';
import { logger } from './logger';

// Simple in-memory cache for document events to ensure consistency
// Cache expires after 30 seconds
let cachedEvents: DocumentStoredEvent[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Invalidate the document events cache
 * Call this after uploading a new document to ensure fresh data
 */
export function invalidateDocumentEventsCache(): void {
  cachedEvents = null;
  cacheTimestamp = 0;
}

export function createSuiClient(): SuiClient {
  return new SuiClient({
    url: doculockConfig.rpcUrl,
  });
}

// Document event type
export interface DocumentStoredEvent {
  document_hash: string;
  creator: string;
  timestamp: number | string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// Document metadata type
export interface DocumentMetadata {
  file_name: string;
  file_size: number;
  mime_type: string;
  timestamp?: number;
}

/**
 * Create a transaction to store a document on-chain
 * @param fileHash - SHA-256 hash of the file (as Uint8Array)
 * @param fileName - Original filename
 * @param fileSize - File size in bytes
 * @param mimeType - MIME type of the file
 * @returns Transaction ready to execute
 */
export async function createStoreDocumentTx(
  fileHash: Uint8Array,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<Transaction> {
  logger.debug('Creating store document transaction...');

  const registryId = getRegistryId();

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  if (!registryId) {
    throw new Error('Registry ID is not configured. Please create registry and set NEXT_PUBLIC_DOCULOCK_REGISTRY_ID in .env.local');
  }

  const txb = new Transaction();

  const target = `${doculockConfig.packageId}::doculock::store_document`;

  txb.moveCall({
    target: target,
    arguments: [
      txb.object(registryId),
      txb.object('0x6'),
      txb.pure.vector('u8', Array.from(fileHash)),
      txb.pure.string(fileName),
      txb.pure.u64(fileSize),
      txb.pure.string(mimeType),
    ],
  });

  // Build the transaction with gas configuration
  txb.setGasBudget(10000000);

  logger.debug('Store document transaction created successfully');
  return txb;
}

// Document info for batch operations
export interface DocumentInfo {
  fileHash: Uint8Array;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Create a PTB to store multiple documents on-chain in a single transaction
 * @param documents - Array of document info to store
 * @returns Transaction ready to execute
 */
export async function createBatchStoreDocumentsTx(
  documents: DocumentInfo[],
): Promise<Transaction> {
  logger.debug('Creating batch store document transaction...', documents.length);

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  const registryId = getRegistryId();
  if (!registryId) {
    throw new Error('Registry ID is not configured. Please create registry and set NEXT_PUBLIC_DOCULOCK_REGISTRY_ID in .env.local');
  }

  const txb = new Transaction();
  const target = `${doculockConfig.packageId}::doculock::store_document`;

  // Add Clock object once (will be shared across all calls)
  const clock = txb.object('0x6');
  const registry = txb.object(registryId);

  // Add multiple store_document calls to the PTB
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    txb.moveCall({
      target,
      arguments: [
        registry,
        clock,
        txb.pure.vector('u8', Array.from(doc.fileHash)),
        txb.pure.string(doc.fileName),
        txb.pure.u64(doc.fileSize),
        txb.pure.string(doc.mimeType),
      ],
    });
  }

  // Calculate gas budget based on number of documents
  // Base gas: 10,000,000 MIST + 5,000,000 MIST per document
  const gasBudget = 10_000_000 + (documents.length * 5_000_000);
  txb.setGasBudget(gasBudget);

  logger.debug('Batch transaction created successfully');
  return txb;
}

/**
 * Create a transaction to create the document registry
 * @returns Transaction ready to execute
 */
export async function createRegistryTx(): Promise<Transaction> {
  logger.debug('Creating registry transaction...');

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  const txb = new Transaction();

  const target = `${doculockConfig.packageId}::doculock::create_registry`;

  txb.moveCall({
    target: target,
    arguments: [],
  });

  // Build the transaction with gas configuration
  txb.setGasBudget(10000000);

  logger.debug('Registry transaction created successfully');
  return txb;
}

/**
 * Get registry object for debugging
 * @param suiClient - Sui client instance
 * @returns Registry object or null
 */
export async function getRegistryObject(
  suiClient: SuiClient,
): Promise<any | null> {
  try {
    const registryId = getRegistryId();

    if (!registryId) {
      logger.error('Registry ID not found');
      return null;
    }

    const registry = await suiClient.getObject({
      id: registryId,
      options: {
        showContent: true,
        showOwner: true,
        showType: true,
      },
    });

    logger.debug('Registry fetched');

    return registry;
  } catch (error) {
    logger.error('Error getting registry:', error);
    return null;
  }
}

/**
 * Verify if a document exists on-chain
 * @param suiClient - Sui client instance
 * @param fileHash - SHA-256 hash of the file (hex string)
 * @returns Boolean indicating if document exists
 */
export async function verifyDocument(
  suiClient: SuiClient,
  fileHash: string,
): Promise<boolean> {
  try {
    const registryId = getRegistryId();
    const packageId = doculockConfig.packageId;

    if (!registryId) {
      logger.error('Registry ID not found');
      return false;
    }

    if (!packageId) {
      logger.error('Package ID not found');
      return false;
    }

    // Remove 0x prefix if present and normalize
    let hashHex = fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash;
    hashHex = hashHex.toLowerCase().trim();

    // Validate hash format
    if (!/^[a-f0-9]{64}$/.test(hashHex)) {
      logger.error('Invalid hash format');
      return false;
    }

    // Method 1: Try querying DocumentStored events (most reliable)
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::doculock::DocumentStored`,
      },
    });

    // Search for matching hash in events
    for (const event of events.data) {
      const parsed = event.parsedJson as any;
      let eventHash = parsed.document_hash;

      // Convert to string if it's an array of bytes
      if (Array.isArray(eventHash)) {
        eventHash = bytesToHex(new Uint8Array(eventHash));
      } else if (typeof eventHash !== 'string') {
        eventHash = String(eventHash);
      }

      // Normalize event hash
      eventHash = eventHash.toLowerCase().trim();

      // Compare hashes
      if (eventHash && eventHash === hashHex) {
        return true;
      }
    }

    // Method 2: Try dynamic field query (for Table)
    // Parse hex to bytes array
    const bytes: number[] = [];
    for (let i = 0; i < hashHex.length; i += 2) {
      bytes.push(parseInt(hashHex.slice(i, i + 2), 16));
    }

    // Try getDynamicFieldObject
    const dynamicField = await suiClient.getDynamicFieldObject({
      parentId: registryId,
      name: {
        type: 'vector<u8>',
        value: bytes,
      },
    });

    if (!dynamicField.error) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Error verifying document:', error);
    return false;
  }
}

/**
 * Get document metadata from blockchain
 * @param suiClient - Sui client instance
 * @param fileHash - SHA-256 hash of the file (hex string)
 * @returns Document metadata or null if not found
 */
export async function getDocumentMetadata(
  suiClient: SuiClient,
  fileHash: string,
): Promise<DocumentMetadata | null> {
  try {
    const packageId = doculockConfig.packageId;

    if (!packageId) {
      logger.error('Package ID not found');
      return null;
    }

    // Remove 0x prefix if present and normalize
    let hashHex = fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash;
    hashHex = hashHex.toLowerCase().trim();

    // Query DocumentStored events to find the document
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::doculock::DocumentStored`,
      },
    });

    // Search for matching hash in events
    for (const event of events.data) {
      const parsed = event.parsedJson as any;
      let eventHash = parsed.document_hash;

      // Convert to string if it's an array of bytes
      if (Array.isArray(eventHash)) {
        eventHash = bytesToHex(new Uint8Array(eventHash));
      } else if (typeof eventHash !== 'string') {
        eventHash = String(eventHash);
      }

      // Normalize event hash
      eventHash = eventHash.toLowerCase().trim();

      // Compare hashes
      if (eventHash && eventHash === hashHex) {
        // Convert timestamp to number if it's a string
        let timestamp = parsed.timestamp;
        if (typeof timestamp === 'string') {
          timestamp = parseInt(timestamp, 10);
        }

        return {
          file_name: parsed.file_name,
          file_size: parsed.file_size,
          mime_type: parsed.mime_type,
          timestamp: timestamp as number,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error getting document metadata:', error);
    return null;
  }
}

/**
 * Find a document by filename (case-sensitive)
 * @param suiClient - Sui client instance
 * @param fileName - Filename to search for
 * @returns Document event with matching filename or null
 */
export async function findDocumentByName(
  suiClient: SuiClient,
  fileName: string,
): Promise<DocumentStoredEvent | null> {
  try {
    const packageId = doculockConfig.packageId;

    if (!packageId) {
      logger.error('Package ID not found');
      return null;
    }

    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::doculock::DocumentStored`,
      },
    });

    for (const event of events.data) {
      const parsed = event.parsedJson as any;

      if (parsed.file_name === fileName) {
        let eventHash = parsed.document_hash;

        if (Array.isArray(eventHash)) {
          eventHash = bytesToHex(new Uint8Array(eventHash));
        } else if (typeof eventHash !== 'string') {
          eventHash = String(eventHash);
        }

        return {
          document_hash: eventHash,
          creator: parsed.creator,
          timestamp: parsed.timestamp,
          file_name: parsed.file_name,
          file_size: parsed.file_size,
          mime_type: parsed.mime_type,
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('Error finding document by name:', error);
    return null;
  }
}

/**
 * Query DocumentStored events for a specific creator
 * @param suiClient - Sui client instance
 * @param creatorAddress - Wallet address of the creator
 * @returns Array of document events
 */
export async function getDocumentEvents(
  suiClient: SuiClient,
  creatorAddress?: string,
): Promise<DocumentStoredEvent[]> {
  try {
    const now = Date.now();
    const useCache = cachedEvents !== null && (now - cacheTimestamp) < CACHE_TTL;

    if (useCache) {
      const result = creatorAddress
        ? cachedEvents!.filter(event => event.creator === creatorAddress)
        : cachedEvents!;
      return result;
    }

    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
    });

    const filteredEvents = creatorAddress
      ? events.data.filter(event => {
          const parsed = event.parsedJson as any;
          return parsed.creator === creatorAddress;
        })
      : events.data;

    const result: DocumentStoredEvent[] = [];

    for (const event of filteredEvents) {
      const parsed = event.parsedJson as any;
      let eventHash = parsed.document_hash;

      // IMPORTANT: Use transaction timestamp (timestampMs) instead of event timestamp
      // because SUI clock.timestamp_ms() is not Unix epoch, it's SUI internal timestamp
      // timestampMs is the actual Unix timestamp when the transaction was executed
      const timestamp = event.timestampMs;
      if (!timestamp) {
        continue;
      }

      // Convert array of bytes to hex string if needed
      if (Array.isArray(eventHash)) {
        eventHash = bytesToHex(new Uint8Array(eventHash));
      } else if (typeof eventHash !== 'string') {
        eventHash = String(eventHash);
      }

      result.push({
        document_hash: eventHash,
        creator: parsed.creator,
        timestamp: timestamp, // Use actual Unix timestamp from timestampMs
        file_name: parsed.file_name,
        file_size: Number(parsed.file_size) || 0,
        mime_type: parsed.mime_type,
      });
    }

    // Cache the result
    cachedEvents = result;
    cacheTimestamp = now;

    const finalResult = creatorAddress
      ? result.filter(event => event.creator === creatorAddress)
      : result;

    return finalResult;
  } catch (error) {
    logger.error('Error fetching document events:', error);
    return [];
  }
}

/**
 * Debug function to list all stored documents
 * @param suiClient - Sui client instance
 */
export async function debugListAllDocuments(suiClient: SuiClient): Promise<void> {
  try {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
    });

    logger.debug('Total documents found:', events.data.length);

    for (let i = 0; i < events.data.length; i++) {
      const event = events.data[i];
      const parsed = event.parsedJson as any;
      let eventHash = parsed.document_hash;

      // Convert array of bytes to hex string if needed
      if (Array.isArray(eventHash)) {
        eventHash = bytesToHex(new Uint8Array(eventHash));
      } else if (typeof eventHash !== 'string') {
        eventHash = String(eventHash);
      }

      logger.debug(`Document ${i + 1}:`, parsed.file_name, eventHash?.length, 'bytes');
    }
  } catch (error) {
    logger.error('debugListAllDocuments error:', error);
  }
}
