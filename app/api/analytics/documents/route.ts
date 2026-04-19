import { NextRequest, NextResponse } from 'next/server';
import { createSuiClient, getDocumentEvents } from '@/lib/doculock';

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

    const suiClient = createSuiClient();
    let events = await getDocumentEvents(suiClient);

    // Retry if no events found (timing issue with SUI fullnode)
    let retries = 0;
    const maxRetries = 3;
    while (events.length === 0 && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      events = await getDocumentEvents(suiClient);
      retries++;
    }

    const validEvents = events.filter(event => {
      let timestamp = event.timestamp;
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }
      const isValid = timestamp && !isNaN(timestamp) && timestamp > 0;
      if (!isValid) {
        console.log('[Analytics Documents] Filtered out invalid timestamp event:', event.file_name, 'timestamp:', timestamp);
      }
      return isValid;
    });

    const sortedEvents = [...validEvents].sort((a, b) => {
      let timestampA = a.timestamp;
      let timestampB = b.timestamp;
      if (typeof timestampA === 'string') timestampA = parseInt(timestampA, 10);
      if (typeof timestampB === 'string') timestampB = parseInt(timestampB, 10);
      return (timestampB as number) - (timestampA as number);
    });

    const topDocuments: TopDocument[] = sortedEvents.slice(0, limit).map(event => ({
      fileName: event.file_name,
      fileSize: event.file_size,
      mimeType: event.mime_type,
      creator: event.creator,
      timestamp: event.timestamp,
      hash: event.document_hash,
    }));

    return NextResponse.json(topDocuments);
  } catch (error) {
    console.error('[Analytics Documents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics documents' },
      { status: 500 }
    );
  }
}
