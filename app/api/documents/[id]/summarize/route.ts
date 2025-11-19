/**
 * API Route: Trigger Document Summarization
 * POST /api/documents/[id]/summarize
 *
 * Manually trigger summarization for a document after successful extraction.
 * This endpoint can be called:
 * - Manually by officials to retry failed summarizations
 * - Automatically after extraction completes (handled by Inngest)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    // Verify authentication
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an official
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'official') {
      return NextResponse.json({ error: 'Forbidden - Officials only' }, { status: 403 });
    }

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if extraction is completed
    if (document.extraction_status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Document extraction must be completed first',
          extractionStatus: document.extraction_status,
        },
        { status: 400 }
      );
    }

    // Check if extraction has text
    if (!document.extracted_text_url) {
      return NextResponse.json(
        { error: 'No extracted text available for summarization' },
        { status: 400 }
      );
    }

    // Check if already summarizing
    if (document.summarization_status === 'summarizing') {
      return NextResponse.json(
        {
          error: 'Summarization already in progress',
          status: document.summarization_status,
        },
        { status: 409 }
      );
    }

    // Check if already completed
    if (document.summarization_status === 'completed' && document.summary_en) {
      return NextResponse.json(
        {
          message: 'Summarization already completed',
          status: document.summarization_status,
          summary: document.summary_en,
        },
        { status: 200 }
      );
    }

    // Reset status to pending
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        summarization_status: 'pending',
        summary_error: null,
        summary_error_type: null,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document status:', updateError);
      return NextResponse.json(
        { error: 'Failed to prepare document for summarization' },
        { status: 500 }
      );
    }

    // Send Inngest event to trigger summarization
    await inngest.send({
      name: INNGEST_EVENTS.EXTRACTION_COMPLETED,
      data: {
        documentId,
        extractedTextUrl: document.extracted_text_url,
        requestedBy: user.id,
      },
    });

    console.log(`[Summarization] Manual trigger for document ${documentId} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Summarization job queued successfully',
      documentId,
      status: 'pending',
    });
  } catch (error) {
    console.error('[Summarization API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
