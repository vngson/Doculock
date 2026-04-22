import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection } from '@/lib/mongodb';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const collection = await getDocumentsCollection();

    // Get sample documents to check timestamps
    const sampleDocs = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // Vietnam timezone (UTC+7)
    const vietnamTimezone = 'Asia/Ho_Chi_Minh';
    const timezoneOffsetMs = 7 * 60 * 60 * 1000;

    // Get daily counts for last 7 days using Vietnam timezone
    const now = new Date();
    const nowMs = now.getTime();

    const vietnamNow = new Date(nowMs + timezoneOffsetMs);
    const vietnamDayStart = new Date(
      vietnamNow.getFullYear(),
      vietnamNow.getMonth(),
      vietnamNow.getDate(),
      0, 0, 0, 0
    );
    const vietnamDayStartMs = vietnamDayStart.getTime() - timezoneOffsetMs;

    const dayMs = 24 * 60 * 60 * 1000;

    const dailyCounts = [];

    for (let i = 0; i < 7; i++) {
      const dayOffset = i * dayMs;
      const targetDateMs = vietnamDayStartMs - dayOffset;
      const targetDate = new Date(targetDateMs + timezoneOffsetMs);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Use MongoDB aggregation with Vietnam timezone
      const startOfDay = new Date(year, targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0).getTime() - timezoneOffsetMs;
      const endOfDay = new Date(year, targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).getTime() - timezoneOffsetMs;

      const count = await collection.countDocuments({
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      });

      dailyCounts.push({
        date: dateStr,
        utcStart: new Date(startOfDay).toISOString(),
        utcEnd: new Date(endOfDay).toISOString(),
        vietnamStart: new Date(startOfDay + timezoneOffsetMs).toISOString(),
        vietnamEnd: new Date(endOfDay + timezoneOffsetMs).toISOString(),
        count,
      });
    }

    return NextResponse.json({
      timezone: vietnamTimezone,
      offsetHours: '+07:00',
      sampleDocs: sampleDocs.map((doc: any) => ({
        fileName: doc.file_name,
        timestamp: doc.timestamp,
        timestampUTC: new Date(doc.timestamp).toISOString(),
        timestampVietnam: new Date(doc.timestamp + timezoneOffsetMs).toISOString(),
        timestampVietnamLocal: new Date(doc.timestamp + timezoneOffsetMs).toLocaleString('vi-VN'),
      })),
      dailyCounts,
      currentTime: {
        local: new Date().toLocaleString('vi-VN'),
        utc: new Date().toISOString(),
        timestamp: nowMs,
      },
    });
  } catch (error) {
    console.error('[Analytics Debug] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
