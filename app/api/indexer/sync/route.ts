import { NextRequest, NextResponse } from 'next/server';
import { syncEvents, getSyncStats } from '@/services/indexer';
import { createSuiClient } from '@/lib/doculock';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/indexer/sync - Trigger sync of blockchain events to MongoDB
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, { max: 10, windowMs: 60000 });
  if (rl) return rl;

  const apiKey = request.headers.get('x-api-key');
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const suiClient = createSuiClient();
    const syncedCount = await syncEvents(suiClient);

    const stats = await getSyncStats();

    return NextResponse.json({
      success: true,
      syncedCount,
      stats,
    });
  } catch (error) {
    console.error('[Indexer API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/indexer/sync - Get sync statistics
 */
export async function GET(request: Request) {
  const rl = rateLimit(request, { max: 60, windowMs: 60000 });
  if (rl) return rl;

  try {
    const stats = await getSyncStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Indexer API] Error getting stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
