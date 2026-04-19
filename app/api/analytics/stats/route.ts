import { NextRequest, NextResponse } from 'next/server';
import { createSuiClient, getDocumentEvents } from '@/lib/doculock';

export interface AnalyticsStats {
  totalDocuments: number;
  uniqueUsers: number;
  totalFileSize: number;
  avgFileSize: number;
  topMimeTypes: { type: string; count: number }[];
}

export async function GET(request: NextRequest) {
  try {
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

    // Filter out events with invalid timestamps
    const validEvents = events.filter(event => {
      let timestamp = event.timestamp;
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }
      return timestamp && !isNaN(timestamp) && timestamp > 0;
    });

    const uniqueUsers = new Set(validEvents.map(e => e.creator));
    const totalFileSize = validEvents.reduce((sum, e) => sum + e.file_size, 0);
    const avgFileSize = validEvents.length > 0 ? totalFileSize / validEvents.length : 0;

    const mimeTypeCounts = new Map<string, number>();
    validEvents.forEach(e => {
      const count = mimeTypeCounts.get(e.mime_type) || 0;
      mimeTypeCounts.set(e.mime_type, count + 1);
    });

    const topMimeTypes = Array.from(mimeTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats: AnalyticsStats = {
      totalDocuments: validEvents.length,
      uniqueUsers: uniqueUsers.size,
      totalFileSize: Number(totalFileSize) || 0,
      avgFileSize: Number(avgFileSize) || 0,
      topMimeTypes,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Analytics Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics stats' },
      { status: 500 }
    );
  }
}
