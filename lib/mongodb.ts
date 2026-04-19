import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

if (!process.env.MONGODB_DB_NAME) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// In development, use global variable to preserve connection across hot reloads
declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

/**
 * Get database instance
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME);
}

/**
 * Get documents collection
 */
export async function getDocumentsCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection('documents');
}

/**
 * Document type
 */
export interface StoredDocument {
  _id?: string;
  document_hash: string;
  creator: string;
  timestamp: number;
  file_name: string;
  file_size: number;
  mime_type: string;
  tx_digest?: string;
  tx_timestamp_ms?: number;
  indexed_at?: Date;
}

/**
 * Analytics document type (for API responses)
 */
export interface AnalyticsDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number;
  hash: string;
}

/**
 * Convert StoredDocument to AnalyticsDocument
 */
export function toAnalyticsDocument(doc: StoredDocument): AnalyticsDocument {
  return {
    fileName: doc.file_name,
    fileSize: doc.file_size,
    mimeType: doc.mime_type,
    creator: doc.creator,
    timestamp: doc.timestamp,
    hash: doc.document_hash,
  };
}
