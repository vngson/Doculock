import { MongoClient, Db, Collection } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable');
}

if (!process.env.MONGODB_DB) {
  throw new Error('Please define MONGODB_DB environment variable');
}

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient(): Promise<MongoClient> {
  client = new MongoClient(uri, options);
  return client.connect();
}

export async function getClient(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  if (typeof global !== 'undefined' && global._mongoClientPromise) {
    clientPromise = global._mongoClientPromise;
    return clientPromise;
  }

  clientPromise = createClient();

  if (typeof global !== 'undefined') {
    global._mongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export default getClient();

export async function getDb(): Promise<Db> {
  const client = await getClient();
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
