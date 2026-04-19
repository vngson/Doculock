import { NextRequest, NextResponse } from 'next/server';
import { createSuiClient, getDocumentEvents } from '@/lib/doculock';

export interface TrendDataPoint {
  date: string;
  count: number;
  totalSize: number;
  uniqueUsers: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

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

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const dailyData = new Map<string, TrendDataPoint>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      // Use local date instead of UTC to match user's timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      dailyData.set(dateStr, {
        date: dateStr,
        count: 0,
        totalSize: 0,
        uniqueUsers: 0,
      });
    }

    const dailyUsers = new Map<string, Set<string>>();

    events.forEach(event => {
      // Convert timestamp to number if it's a string, or use as-is if already number
      let timestamp = event.timestamp;
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }

      // Skip invalid timestamps
      if (!timestamp || isNaN(timestamp) || timestamp < 0) {
        return;
      }

      const eventDate = new Date(timestamp);
      // Use local date instead of UTC to match user's timezone
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (dailyData.has(dateStr)) {
        const data = dailyData.get(dateStr)!;
        data.count += 1;
        data.totalSize += event.file_size;

        if (!dailyUsers.has(dateStr)) {
          dailyUsers.set(dateStr, new Set());
        }
        dailyUsers.get(dateStr)!.add(event.creator);
      }
    });

    dailyUsers.forEach((users, date) => {
      if (dailyData.has(date)) {
        dailyData.get(date)!.uniqueUsers = users.size;
      }
    });

    return NextResponse.json(Array.from(dailyData.values()));
  } catch (error) {
    console.error('[Analytics Trends] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics trends' },
      { status: 500 }
    );
  }
}
