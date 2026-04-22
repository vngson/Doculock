import { NextRequest, NextResponse } from 'next/server';
import { clearIndex, syncEvents } from '@/services/indexer';
import { createSuiClient } from '@/lib/doculock';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/indexer/resync - Clear and resync all documents
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, { max: 5, windowMs: 60000 });
  if (rl) return rl;

  const apiKey = request.headers.get('x-api-key');
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

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
