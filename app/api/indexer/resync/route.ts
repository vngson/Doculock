import { NextRequest, NextResponse } from 'next/server';
import { clearIndex, syncEvents } from '@/services/indexer';
import { createSuiClient } from '@/lib/doculock';

/**
 * POST /api/indexer/resync - Clear and resync all documents
 */
export async function POST() {
  try {
    console.log('[Indexer Resync API] Starting full resync...');

    // Clear existing index
    const deletedCount = await clearIndex();

    // Sync events from blockchain
    const suiClient = createSuiClient();
    const syncedCount = await syncEvents(suiClient);

    return NextResponse.json({
      success: true,
      deletedCount,
      syncedCount,
    });
  } catch (error) {
    console.error('[Indexer Resync API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
