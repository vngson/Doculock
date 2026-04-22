import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection, AnalyticsDocument, toAnalyticsDocument } from '@/lib/mongodb';
import { rateLimit } from '@/lib/rate-limit';
import { validateSearchQuery, validateLimit, validateAddress } from '@/lib/validation';

/**
 * Pagination parameters
 */
interface PaginationParams {
  page?: number;
  limit?: number;
  creator?: string;
  search?: string;
  sort?: 'timestamp' | 'file_name' | 'file_size';
  order?: 'asc' | 'desc';
}

/**
 * GET /api/documents - Query documents from MongoDB with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { max: 60, windowMs: 60000 });
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = validateLimit(searchParams.get('limit'));
    const creator = validateAddress(searchParams.get('creator')) || undefined;
    const searchQuery = validateSearchQuery(searchParams.get('search')) || undefined;
    const sort = searchParams.get('sort') || 'timestamp';
    const order = searchParams.get('order') || 'desc';

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: 'Page must be >= 1' }, { status: 400 });
    }

    const collection = await getDocumentsCollection();

    // Build query
    const query: any = {};

    if (creator) {
      query.creator = creator;
    }

    if (searchQuery) {
      // Use text search on file_name
      query.$text = { $search: searchQuery };
    }

    // Build sort
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: any = {};
    sortObj[sort] = sortOrder;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      collection
        .find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const results: AnalyticsDocument[] = documents.map((doc) => toAnalyticsDocument(doc as any));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
