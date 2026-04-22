import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection, AnalyticsDocument, toAnalyticsDocument } from '@/lib/mongodb';
import { rateLimit } from '@/lib/rate-limit';
import { validateLimit } from '@/lib/validation';

export interface TopDocument {
  fileName: string;
  fileSize: number;
  mimeType: string;
  creator: string;
  timestamp: number | string;
  hash: string;
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { max: 60, windowMs: 60000 });
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const limit = validateLimit(searchParams.get('limit'));

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
