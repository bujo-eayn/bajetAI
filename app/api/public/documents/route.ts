import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatFileSize } from '@/lib/i18n/formatters';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'published';
    const category = searchParams.get('category');
    const year = searchParams.get('year');
    const sort = searchParams.get('sort') || 'newest';

    const offset = (page - 1) * limit;

    // Build query - only published documents for public
    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('status', status);

    // Category filter
    const validCategories = ['budgeting', 'planning', 'healthcare', 'education', 'transport'];
    if (category && validCategories.includes(category)) {
      query = query.eq('category', category);
    }

    // Search filter (case-insensitive title search)
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Year filter
    if (year) {
      const yearInt = parseInt(year);
      const yearStart = `${yearInt}-01-01T00:00:00Z`;
      const yearEnd = `${yearInt}-12-31T23:59:59Z`;
      query = query.gte('created_at', yearStart).lte('created_at', yearEnd);
    }

    // Sorting
    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'title-asc') {
      query = query.order('title', { ascending: true });
    } else if (sort === 'title-desc') {
      query = query.order('title', { ascending: false });
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Public documents fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Transform to public format
    const documents = (data || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      publishedAt: doc.created_at,
      pageCount: doc.extraction_page_count || 0,
      fileSize: formatFileSize(doc.file_size || 0),
      fileUrl: doc.file_url,
      summaryEn: doc.summary_en,
      summarySw: doc.summary_sw,
      hasSummary: !!(doc.summary_en || doc.summary_sw),
      summaryLanguages: [
        doc.summary_en ? 'en' : null,
        doc.summary_sw ? 'sw' : null,
      ].filter(Boolean) as ('en' | 'sw')[],
      summaryConfidence: doc.summary_confidence,
    }));

    return NextResponse.json({
      data: documents,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    });
  } catch (error) {
    console.error('Public documents API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
