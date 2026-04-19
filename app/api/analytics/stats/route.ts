import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection } from '@/lib/mongodb';

export interface AnalyticsStats {
  totalDocuments: number;
  uniqueUsers: number;
  totalFileSize: number;
  avgFileSize: number;
  topMimeTypes: { type: string; count: number }[];
}

export async function GET() {
  try {
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

    const stats: AnalyticsStats = {
      totalDocuments,
      uniqueUsers: uniqueUsersCount,
      totalFileSize: Number(totalFileSize) || 0,
      avgFileSize: Number(avgFileSize) || 0,
      topMimeTypes,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics stats' },
      { status: 500 }
    );
  }
}
