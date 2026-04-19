import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection, AnalyticsDocument, toAnalyticsDocument } from '@/lib/mongodb';

export interface TopDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number | string;
  hash: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    const collection = await getDocumentsCollection();

    const documents = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const topDocuments: TopDocument[] = documents.map((doc) => toAnalyticsDocument(doc as any));

    return NextResponse.json(topDocuments);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics documents' },
      { status: 500 }
    );
  }
}
