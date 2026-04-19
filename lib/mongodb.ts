import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable inside .env.local');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please define MONGODB_DB environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

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

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}

export async function getDocumentsCollection(): Promise<Collection> {
  const db = await getDb();
  return db.collection('documents');
}

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

export interface AnalyticsDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number;
  hash: string;
}

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
