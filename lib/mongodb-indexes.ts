import { getDocumentsCollection } from './mongodb';

export async function createIndexes(): Promise<void> {
  try {
    const collection = await getDocumentsCollection();

    await collection.createIndex(
      { document_hash: 1 },
      { name: 'idx_document_hash', unique: true }
    );

    await collection.createIndex(
      { creator: 1 },
      { name: 'idx_creator' }
    );

    await collection.createIndex(
      { timestamp: -1 },
      { name: 'idx_timestamp' }
    );

    await collection.createIndex(
      { creator: 1, timestamp: -1 },
      { name: 'idx_creator_timestamp' }
    );

    await collection.createIndex(
      { file_name: 'text' },
      { name: 'idx_file_name_text' }
    );

    await collection.createIndex(
      { tx_digest: 1 },
      { name: 'idx_tx_digest', sparse: true }
    );
  } catch (error) {
    console.error('[MongoDB Indexes] Error creating indexes:', error);
    throw error;
  }
}

export async function listIndexes(): Promise<void> {
  try {
    const collection = await getDocumentsCollection();
    const indexes = await collection.listIndexes().toArray();

    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, idx.key);
    });
  } catch (error) {
    console.error('[MongoDB Indexes] Error listing indexes:', error);
  }
}
