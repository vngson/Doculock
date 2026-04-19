import { NextRequest, NextResponse } from 'next/server';
import { syncEvents, getSyncStats } from '@/services/indexer';
import { createSuiClient } from '@/lib/doculock';

/**
 * POST /api/indexer/sync - Trigger sync of blockchain events to MongoDB
 */
export async function POST() {
  try {
    console.log('[Indexer API] Starting sync...');

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
export async function GET() {
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
