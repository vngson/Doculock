import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection } from '@/lib/mongodb';
import { doculockConfig } from '@/lib/config';
import { rateLimit } from '@/lib/rate-limit';

export interface AnalyticsStats {
  totalDocuments: number;
  uniqueUsers: number;
  totalCreators: number;
  totalFileSize: number;
  avgFileSize: number;
  topMimeTypes: { type: string; count: number }[];
  networkName: string;
  latestTxTimestamp: string | null;
}

export async function GET(request: Request) {
  const rl = rateLimit(request, { max: 60, windowMs: 60000 });
  if (rl) return rl;

  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI not configured' },
        { status: 500 }
      );
    }

    const collection = await getDocumentsCollection();

    const totalDocuments = await collection.countDocuments();

    const uniqueUsers = await collection.distinct('creator');
    const uniqueUsersCount = uniqueUsers.length;

    const sizeAggregation = await collection
      .aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$file_size' },
            avgSize: { $avg: '$file_size' },
          },
        },
      ])
      .toArray();

    const totalFileSize = sizeAggregation[0]?.totalSize || 0;
    const avgFileSize = sizeAggregation[0]?.avgSize || 0;

    const mimeTypeAggregation = await collection
      .aggregate([
        {
          $group: {
            _id: '$mime_type',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            type: '$_id',
            count: 1,
          },
        },
      ])
      .toArray();

    const topMimeTypes = mimeTypeAggregation.map((item) => ({
      type: item.type || 'unknown',
      count: item.count,
    }));

    const lastDoc = await collection.findOne({}, { sort: { indexed_at: -1 } });

    const stats: AnalyticsStats = {
      totalDocuments,
      uniqueUsers: uniqueUsersCount,
      totalCreators: uniqueUsersCount,
      totalFileSize: Number(totalFileSize) || 0,
      avgFileSize: Number(avgFileSize) || 0,
      topMimeTypes,
      networkName: doculockConfig.network || 'testnet',
      latestTxTimestamp: lastDoc?.indexed_at ? new Date(lastDoc.indexed_at).toISOString() : null,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
