import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsCollection, AnalyticsDocument, toAnalyticsDocument } from '@/lib/mongodb';

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
  try {
    const { searchParams } = new URL(request.url);

    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const creator = searchParams.get('creator') || undefined;
    const searchQuery = searchParams.get('search') || undefined;
    const sort = searchParams.get('sort') || 'timestamp';
    const order = searchParams.get('order') || 'desc';

    // Validate parameters
    if (page < 1) {
      return NextResponse.json({ error: 'Page must be >= 1' }, { status: 400 });
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
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

    console.log('[Documents API] Query:', JSON.stringify(query));
    console.log('[Documents API] Sort:', JSON.stringify(sortObj));

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
