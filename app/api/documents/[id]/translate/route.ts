/**
 * API Route: Translate Document Summary
 * POST /api/documents/[id]/translate
 *
 * Manually trigger translation for a document's English summary to Swahili.
 * Officials only. Useful for:
 * - Retrying failed translations
 * - Re-translating after summary edits
 * - Manual translation trigger
 *
 * Phase: 6 - Translation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params (Next.js 15 async params requirement)
    const { id: documentId } = await params;

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Check if user is official
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'official') {
      return NextResponse.json(
        { error: 'Forbidden. Only officials can trigger translations.' },
        { status: 403 }
      );
    }

    // 3. Fetch document to validate
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 4. Validation: Check if document has English summary
    if (!document.summary_en || document.summary_en.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Cannot translate: Document has no English summary',
          details: 'Please complete summarization first',
        },
        { status: 400 }
      );
    }

    // 5. Check if translation is already in progress
    if (document.translation_status === 'translating') {
      return NextResponse.json(
        {
          error: 'Translation already in progress',
          status: document.translation_status,
        },
        { status: 409 }
      );
    }

    // 6. Update status to pending (will be picked up by Inngest)
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        translation_status: 'pending',
        translation_error: null,
        translation_error_type: null,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[API] Error updating translation status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document status' },
        { status: 500 }
      );
    }

    // 7. Send Inngest event to trigger translation
    try {
      await inngest.send({
        name: 'document.summarization-completed',
        data: {
          documentId,
          englishSummary: document.summary_en,
        },
      });

      console.log(
        `[API] Translation queued successfully for document ${documentId}`
      );

      return NextResponse.json({
        success: true,
        message: 'Translation queued successfully',
        documentId,
        status: 'pending',
      });
    } catch (inngestError) {
      console.error('[API] Error sending Inngest event:', inngestError);

      // Revert status update
      await supabase
        .from('documents')
        .update({ translation_status: document.translation_status })
        .eq('id', documentId);

      return NextResponse.json(
        { error: 'Failed to queue translation job' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Unexpected error in translate route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/[id]/translate
 * Get translation status for a document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await params (Next.js 15 async params requirement)
    const { id: documentId } = await params;

    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Fetch document translation status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(
        `
        id,
        title,
        translation_status,
        translation_started_at,
        translation_completed_at,
        translation_duration_ms,
        translation_confidence,
        translation_error,
        translation_error_type,
        translation_source_chars,
        translation_output_chars,
        translation_source_words,
        translation_output_words,
        translation_model_version,
        translation_provider,
        summary_en,
        summary_sw
      `
      )
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 3. Calculate metrics if available
    const metrics = {
      hasEnglishSummary: !!(document.summary_en && document.summary_en.length > 0),
      hasSwahiliTranslation: !!(document.summary_sw && document.summary_sw.length > 0),
      durationSeconds: document.translation_duration_ms
        ? (document.translation_duration_ms / 1000).toFixed(2)
        : null,
      lengthRatio: document.translation_source_chars && document.translation_output_chars
        ? (document.translation_output_chars / document.translation_source_chars).toFixed(2)
        : null,
    };

    return NextResponse.json({
      documentId: document.id,
      title: document.title,
      status: document.translation_status,
      startedAt: document.translation_started_at,
      completedAt: document.translation_completed_at,
      confidence: document.translation_confidence,
      error: document.translation_error,
      errorType: document.translation_error_type,
      metrics: {
        ...metrics,
        sourceChars: document.translation_source_chars,
        outputChars: document.translation_output_chars,
        sourceWords: document.translation_source_words,
        outputWords: document.translation_output_words,
      },
      provider: document.translation_provider,
      modelVersion: document.translation_model_version,
    });
  } catch (error) {
    console.error('[API] Unexpected error in GET translate route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
