import { SuiClient } from '@mysten/sui/client';
import { getDocumentsCollection, StoredDocument } from '@/lib/mongodb';
import { doculockConfig } from '@/lib/config';
import { bytesToHex } from '@/lib/crypto';
import { logger } from '@/lib/logger';

interface SuiDocumentEvent {
  id: {
    txDigest: string;
    eventSeq: string;
  };
  parsedJson: {
    document_hash: number[] | string;
    creator: string;
    timestamp: number | string;
    file_name: string;
    file_size: number;
    mime_type: string;
  };
  timestampMs: number;
}

function eventToDocument(event: any): StoredDocument {
  const parsed = event.parsedJson;
  let documentHash: string;

  if (Array.isArray(parsed.document_hash)) {
    documentHash = bytesToHex(new Uint8Array(parsed.document_hash));
  } else {
    documentHash = String(parsed.document_hash);
  }

  documentHash = documentHash.toLowerCase();

  let timestamp = parsed.timestamp;
  if (typeof timestamp === 'string') {
    timestamp = parseInt(timestamp, 10);
  }

  // Handle timestampMs - convert from string if needed
  let eventTimestampMs = event.timestampMs;
  if (typeof eventTimestampMs === 'string') {
    eventTimestampMs = parseInt(eventTimestampMs, 10);
  } else if (!eventTimestampMs) {
    eventTimestampMs = Date.now();
  }

  return {
    document_hash: documentHash,
    creator: parsed.creator,
    timestamp: timestamp as number,
    file_name: parsed.file_name,
    file_size: Number(parsed.file_size),
    mime_type: parsed.mime_type,
    tx_digest: event.id.txDigest,
    tx_timestamp_ms: eventTimestampMs as number,
    indexed_at: new Date(),
  };
}

export async function syncEvents(suiClient: SuiClient): Promise<number> {
  try {
    const collection = await getDocumentsCollection();

    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
      order: 'ascending',
    });

    const existingHashes = new Set(
      (await collection.distinct('document_hash')).map((h) => h as string)
    );

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const event of events.data) {
      try {
        const document = eventToDocument(event);

        if (existingHashes.has(document.document_hash)) {
          skippedCount++;
          continue;
        }

        const result = await collection.updateOne(
          { document_hash: document.document_hash },
          { $set: document },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          syncedCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    return syncedCount;
  } catch (error) {
    logger.error('Error syncing events:', error);
    throw error;
  }
}

export async function getSyncStats(): Promise<{
  blockchainCount: number;
  databaseCount: number;
  lastSyncedAt?: Date;
}> {
  try {
    const suiClient = new SuiClient({ url: doculockConfig.rpcUrl });
    const collection = await getDocumentsCollection();

    const blockchainEvents = await suiClient.queryEvents({
      query: {
        MoveEventType: `${doculockConfig.packageId}::doculock::DocumentStored`,
      },
    });
    const blockchainCount = blockchainEvents.data.length;

    const databaseCount = await collection.countDocuments();

    const lastSynced = await collection
      .findOne({}, { sort: { indexed_at: -1 } });

    return {
      blockchainCount,
      databaseCount,
      lastSyncedAt: lastSynced?.indexed_at,
    };
  } catch (error) {
    logger.error('Error getting sync stats:', error);
    return {
      blockchainCount: 0,
      databaseCount: 0,
    };
  }
}

export async function clearIndex(): Promise<number> {
  try {
    const collection = await getDocumentsCollection();
    const result = await collection.deleteMany({});
    return result.deletedCount;
  } catch (error) {
    logger.error('Error clearing index:', error);
    throw error;
  }
}
