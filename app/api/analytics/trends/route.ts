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
    const events = await getDocumentEvents(suiClient);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const dailyData = new Map<string, TrendDataPoint>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * dayMs);
      const dateStr = date.toISOString().split('T')[0];
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
        console.warn('[Analytics Trends] Invalid timestamp:', event.timestamp, 'for document:', event.file_name);
        return;
      }

      const eventDate = new Date(timestamp);
      const dateStr = eventDate.toISOString().split('T')[0];

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
