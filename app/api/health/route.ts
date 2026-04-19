import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    await db.admin().ping();

    const collections = await db.listCollections().toArray();

    return NextResponse.json({
      status: 'ok',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        mongodb_uri_set: !!process.env.MONGODB_URI,
        mongodb_db_set: !!process.env.MONGODB_DB
      },
      { status: 500 }
    );
  }
}
