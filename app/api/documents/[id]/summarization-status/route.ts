/**
 * API Route: Get Summarization Status
 * GET /api/documents/[id]/summarization-status
 *
 * Returns the current summarization status for a document
 * Used for polling/real-time updates in the UI
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
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

    // Fetch document summarization status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select(
        `
        id,
        summarization_status,
        summary_en,
        summary_started_at,
        summary_completed_at,
        summary_duration_ms,
        summary_char_count,
        summary_confidence,
        summary_model_version,
        summary_error,
        summary_error_type,
        extraction_char_count
      `
      )
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Calculate estimated time remaining (if summarizing)
    let estimatedTimeRemaining: number | null = null;
    if (document.summarization_status === 'summarizing' && document.summary_started_at) {
      const startedAt = new Date(document.summary_started_at).getTime();
      const now = Date.now();
      const elapsed = now - startedAt;

      // Rough estimate: ~1-2 minutes per 1000 characters
      const estimatedTotal = document.extraction_char_count
        ? (document.extraction_char_count / 1000) * 90000 // 90 seconds per 1000 chars
        : 120000; // Default 2 minutes

      estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
    }

    return NextResponse.json({
      documentId,
      status: document.summarization_status || 'pending',
      summary: document.summary_en || null,
      startedAt: document.summary_started_at,
      completedAt: document.summary_completed_at,
      durationMs: document.summary_duration_ms,
      charCount: document.summary_char_count,
      confidence: document.summary_confidence,
      modelVersion: document.summary_model_version,
      error: document.summary_error,
      errorType: document.summary_error_type,
      estimatedTimeRemaining,
    });
  } catch (error) {
    console.error('[Summarization Status API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
