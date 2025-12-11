import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/documents/[id]/publish
 * Publish a document (only if both EN and SW summaries exist)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the document to check if it has both summaries
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, summary_en, summary_sw, status')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document already published
    if (document.status === 'published') {
      return NextResponse.json(
        { error: 'Document is already published' },
        { status: 400 }
      );
    }

    // Validate that both summaries exist
    if (!document.summary_en || !document.summary_sw) {
      const missing = [];
      if (!document.summary_en) missing.push('English');
      if (!document.summary_sw) missing.push('Swahili');

      return NextResponse.json(
        {
          error: `Cannot publish: Missing ${missing.join(' and ')} summary/translation`,
          canPublish: false,
          missingSummaries: missing,
        },
        { status: 400 }
      );
    }

    // Update document status to published
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error publishing document:', updateError);
      return NextResponse.json(
        { error: 'Failed to publish document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document published successfully',
      document: {
        id: document.id,
        title: document.title,
        status: 'published',
      },
    });
  } catch (error) {
    console.error('Unexpected error publishing document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]/publish
 * Unpublish a document (set status back to processing)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the document
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, status')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if document is published
    if (document.status !== 'published') {
      return NextResponse.json(
        { error: 'Document is not published' },
        { status: 400 }
      );
    }

    // Update document status back to processing
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error unpublishing document:', updateError);
      return NextResponse.json(
        { error: 'Failed to unpublish document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document unpublished successfully',
      document: {
        id: document.id,
        title: document.title,
        status: 'processing',
      },
    });
  } catch (error) {
    console.error('Unexpected error unpublishing document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
