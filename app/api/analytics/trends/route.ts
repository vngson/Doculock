import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection } from '@/lib/mongodb';

export interface TrendDataPoint {
  date: string;
  dateMs: number;
  count: number;
  totalSize: number;
  uniqueUsers: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    if (days < 1 || days > 365) {
      return NextResponse.json({ error: 'Days must be between 1 and 365' }, { status: 400 });
    }

    const collection = await getDocumentsCollection();

    const vietnamTimezone = 'Asia/Ho_Chi_Minh';
    const timezoneOffsetMs = 7 * 60 * 60 * 1000;

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
    const startDate = vietnamDayStartMs - (days - 1) * dayMs;

    const aggregation = await collection
      .aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $toDate: '$timestamp' },
                timezone: vietnamTimezone,
              },
            },
            count: { $sum: 1 },
            totalSize: { $sum: '$file_size' },
            uniqueUsers: { $addToSet: '$creator' },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            count: 1,
            totalSize: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
          },
        },
        { $sort: { date: 1 } },
      ])
      .toArray();

    const dailyData = new Map<string, TrendDataPoint>();

    for (let i = days - 1; i >= 0; i--) {
      const dayMsOffset = i * dayMs;
      const targetDateMs = vietnamDayStartMs - dayMsOffset;
      const targetDate = new Date(targetDateMs + timezoneOffsetMs);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      dailyData.set(dateStr, {
        date: dateStr,
        dateMs: targetDateMs,
        count: 0,
        totalSize: 0,
        uniqueUsers: 0,
      });
    }

    aggregation.forEach((item: any) => {
      if (dailyData.has(item.date)) {
        dailyData.set(item.date, {
          date: item.date,
          dateMs: dailyData.get(item.date)!.dateMs,
          count: item.count,
          totalSize: item.totalSize,
          uniqueUsers: item.uniqueUsers,
        });
      }
    });

    const result = Array.from(dailyData.values());

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics trends' },
      { status: 500 }
    );
  }
}
