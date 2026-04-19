/**
 * DocuLock smart contract interaction utilities
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { doculockConfig, getRegistryId } from './config';
import { bytesToHex } from './crypto';

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
  console.log('[getDocumentEvents] Cache invalidated');
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
  console.log('[doculock] Creating store document transaction...');
  console.log('[doculock] Package ID:', doculockConfig.packageId);

  const registryId = getRegistryId();
  console.log('[doculock] Registry ID:', registryId);

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  if (!registryId) {
    throw new Error('Registry ID is not configured. Please create registry and set NEXT_PUBLIC_DOCULOCK_REGISTRY_ID in .env.local');
  }

  const txb = new Transaction();

  const target = `${doculockConfig.packageId}::doculock::store_document`;
  console.log('[doculock] Move call target:', target);
  console.log('[doculock] File name:', fileName);
  console.log('[doculock] File size:', fileSize);
  console.log('[doculock] Hash length:', fileHash.length);

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

  console.log('[doculock] Store document transaction created successfully');
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
  console.log('[doculock] Creating batch store document transaction...');
  console.log('[doculock] Package ID:', doculockConfig.packageId);
  console.log('[doculock] Number of documents:', documents.length);

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  const registryId = getRegistryId();
  if (!registryId) {
    throw new Error('Registry ID is not configured. Please create registry and set NEXT_PUBLIC_DOCULOCK_REGISTRY_ID in .env.local');
  }

  console.log('[doculock] Registry ID:', registryId);

  const txb = new Transaction();
  const target = `${doculockConfig.packageId}::doculock::store_document`;

  // Add Clock object once (will be shared across all calls)
  const clock = txb.object('0x6');
  const registry = txb.object(registryId);

  // Add multiple store_document calls to the PTB
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`[doculock] Adding document ${i + 1}/${documents.length}:`, doc.fileName);
    console.log(`[doculock]   Hash length:`, doc.fileHash.length);
    console.log(`[doculock]   File size:`, doc.fileSize);

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

  console.log(`[doculock] Batch transaction created with gas budget: ${gasBudget} MIST`);
  console.log('[doculock] Batch transaction created successfully');
  return txb;
}

/**
 * Create a transaction to create the document registry
 * @returns Transaction ready to execute
 */
export async function createRegistryTx(): Promise<Transaction> {
  console.log('[doculock] Creating registry transaction...');
  console.log('[doculock] Package ID:', doculockConfig.packageId);

  if (!doculockConfig.packageId) {
    throw new Error('Package ID is not configured. Please set NEXT_PUBLIC_DOCULOCK_PACKAGE_ID in .env.local');
  }

  const txb = new Transaction();

  const target = `${doculockConfig.packageId}::doculock::create_registry`;
  console.log('[doculock] Move call target:', target);

  txb.moveCall({
    target: target,
    arguments: [],
  });

  // Build the transaction with gas configuration
  txb.setGasBudget(10000000);

  console.log('[doculock] Transaction block created successfully');
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
      console.error('[getRegistryObject] Registry ID not found');
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

    console.log('[getRegistryObject] Registry:', registry);

    return registry;
  } catch (error) {
    console.error('Error getting registry:', error);
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
      console.error('[verifyDocument] Registry ID not found');
      return false;
    }

    if (!packageId) {
      console.error('[verifyDocument] Package ID not found');
      return false;
    }

    // Remove 0x prefix if present and normalize
    let hashHex = fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash;
    hashHex = hashHex.toLowerCase().trim();

    console.log('[verifyDocument] ============================================');
    console.log('[verifyDocument] Hash to verify:', hashHex);
    console.log('[verifyDocument] Hash length:', hashHex.length);
    console.log('[verifyDocument] Registry ID:', registryId);
    console.log('[verifyDocument] Package ID:', packageId);

    // Validate hash format
    if (!/^[a-f0-9]{64}$/.test(hashHex)) {
      console.error('[verifyDocument] Invalid hash format:', hashHex);
      return false;
    }

    // First, get registry to check its state
    const registry = await getRegistryObject(suiClient);
    if (registry && registry.data?.content) {
      console.log('[verifyDocument] Registry total:', registry.data.content.fields?.total);
    }

    // Method 1: Try querying DocumentStored events (most reliable)
    console.log('[verifyDocument] Querying DocumentStored events...');
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::doculock::DocumentStored`,
      },
    });

    console.log('[verifyDocument] Total events found:', events.data.length);

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

      console.log('[verifyDocument] Event hash:', eventHash, 'Type:', typeof eventHash);

      // Compare hashes
      if (eventHash && eventHash === hashHex) {
        console.log('[verifyDocument] ✓ Hash found in events!');
        console.log('[verifyDocument] ============================================');
        return true;
      }
    }

    console.log('[verifyDocument] Hash not found in events');

    // Method 2: Try dynamic field query (for Table)
    // Parse hex to bytes array
    const bytes: number[] = [];
    for (let i = 0; i < hashHex.length; i += 2) {
      bytes.push(parseInt(hashHex.slice(i, i + 2), 16));
    }

    console.log('[verifyDocument] Bytes array length:', bytes.length);

    // Try getDynamicFieldObject
    const dynamicField = await suiClient.getDynamicFieldObject({
      parentId: registryId,
      name: {
        type: 'vector<u8>',
        value: bytes,
      },
    });

    console.log('[verifyDocument] Dynamic field result:', dynamicField);

    if (!dynamicField.error) {
      console.log('[verifyDocument] ✓ Hash found in dynamic field!');
      console.log('[verifyDocument] ============================================');
      return true;
    }

    console.log('[verifyDocument] Hash not found on blockchain');
    console.log('[verifyDocument] ============================================');
    return false;
  } catch (error) {
    console.error('[verifyDocument] Error verifying document:', error);
    console.log('[verifyDocument] ============================================');
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
      console.error('[getDocumentMetadata] Package ID not found');
      return null;
    }

    // Remove 0x prefix if present and normalize
    let hashHex = fileHash.startsWith('0x') ? fileHash.slice(2) : fileHash;
    hashHex = hashHex.toLowerCase().trim();

    console.log('[getDocumentMetadata] Hash to lookup:', hashHex);

    // Query DocumentStored events to find the document
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::doculock::DocumentStored`,
      },
    });

    console.log('[getDocumentMetadata] Total events found:', events.data.length);

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
        console.log('[getDocumentMetadata] Found document in events!');
        console.log('[getDocumentMetadata] Timestamp raw value:', parsed.timestamp, 'Type:', typeof parsed.timestamp);

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

    console.log('[getDocumentMetadata] Document not found');
    return null;
  } catch (error) {
    console.error('Error getting document metadata:', error);
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
      console.error('[findDocumentByName] Package ID not found');
      return null;
    }

    console.log('[findDocumentByName] Searching for file:', fileName);

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

        console.log('[findDocumentByName] Found file with matching name!');
        console.log('[findDocumentByName] Event hash:', eventHash);

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

    console.log('[findDocumentByName] No file found with matching name');
    return null;
  } catch (error) {
    console.error('Error finding document by name:', error);
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
      console.log('[getDocumentEvents] Using cached events, count:', cachedEvents!.length);
      const result = creatorAddress
        ? cachedEvents!.filter(event => event.creator === creatorAddress)
        : cachedEvents!;
      console.log('[getDocumentEvents] Filtered events count:', result.length);
      return result;
    }

    console.log('[getDocumentEvents] Querying events with packageId:', doculockConfig.packageId);
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
    });

    console.log('[getDocumentEvents] Total events found:', events.data.length);
    console.log('[getDocumentEvents] First event:', events.data[0]);

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
        console.log('[getDocumentEvents] WARNING: Skipping event without timestampMs:', parsed.file_name, 'parsed.timestamp:', parsed.timestamp);
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
    console.log('[getDocumentEvents] Cached events, count:', result.length);

    const finalResult = creatorAddress
      ? result.filter(event => event.creator === creatorAddress)
      : result;

    console.log('[getDocumentEvents] Final result count:', finalResult.length);
    return finalResult;
  } catch (error) {
    console.error('Error fetching document events:', error);
    return [];
  }
}

/**
 * Debug function to list all stored documents
 * @param suiClient - Sui client instance
 */
export async function debugListAllDocuments(suiClient: SuiClient): Promise<void> {
  try {
    console.log('[debugListAllDocuments] ============================================');
    console.log('[debugListAllDocuments] Package ID:', doculockConfig.packageId);
    console.log('[debugListAllDocuments] Registry ID:', getRegistryId());

    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
    });

    console.log('[debugListAllDocuments] Total documents found:', events.data.length);

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

      console.log('[debugListAllDocuments] Document', i + 1, ':');
      console.log('  - File name:', parsed.file_name);
      console.log('  - Hash:', eventHash);
      console.log('  - Hash length:', eventHash?.length);
      console.log('  - File size:', parsed.file_size);
      console.log('  - MIME type:', parsed.mime_type);
      console.log('  - Creator:', parsed.creator);
      console.log('  - Timestamp:', parsed.timestamp);
    }

    console.log('[debugListAllDocuments] ============================================');
  } catch (error) {
    console.error('[debugListAllDocuments] Error:', error);
  }
}
