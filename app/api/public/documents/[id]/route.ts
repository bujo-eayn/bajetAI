import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatFileSize } from '@/lib/i18n/formatters';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('documents')
      .select(
        `
        *,
        uploader:profiles!documents_uploaded_by_fkey(
          full_name,
          role
        )
      `
      )
      .eq('id', id)
      .eq('status', 'published') // Only published documents for public
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Transform to public format
    const document = {
      id: data.id,
      title: data.title,
      description: '', // Add description field to database if needed
      publishedAt: data.created_at,
      updatedAt: data.updated_at,
      pageCount: data.extraction_page_count || 0,
      fileSize: formatFileSize(data.file_size || 0),
      fileUrl: data.file_url,
      fileType: 'application/pdf',
      summaryEn: data.summary_en,
      summarySw: data.summary_sw,
      summaryConfidence: data.summary_confidence,
      summaryGeneratedAt: data.summary_completed_at,
      translationConfidence: data.translation_confidence,
      translationGeneratedAt: data.translation_completed_at,
      uploader: {
        fullName: data.uploader?.full_name || 'Government Official',
        role: data.uploader?.role || 'official',
      },
    };

    return NextResponse.json({
      data: document,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Public document fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
