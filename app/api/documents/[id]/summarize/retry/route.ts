/**
 * API Route: Retry Failed Summarization
 * POST /api/documents/[id]/summarize/retry
 *
 * Manually triggers a retry of a failed summarization job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is official
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'official') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, extraction_status, extracted_text_url, summarization_status, summary_error_type')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Validate eligibility
    if (document.extraction_status !== 'completed') {
      return NextResponse.json(
        { error: 'Extraction must be completed first' },
        { status: 400 }
      );
    }

    if (!document.extracted_text_url) {
      return NextResponse.json(
        { error: 'No extracted text available' },
        { status: 400 }
      );
    }

    if (document.summarization_status === 'summarizing') {
      return NextResponse.json(
        { error: 'Summarization already in progress' },
        { status: 400 }
      );
    }

    // Reset status
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        summarization_status: 'pending',
        summary_error: null,
        summary_error_type: null,
        summary_started_at: null,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reset status' }, { status: 500 });
    }

    // Trigger job
    await inngest.send({
      name: 'document.summarization-requested',
      data: {
        documentId: id,
        extractedTextUrl: document.extracted_text_url,
      },
    });

    return NextResponse.json({ success: true, documentId: id }, { status: 200 });
  } catch (error) {
    console.error('[Retry] Error:', error);
    return NextResponse.json({ error: 'Failed to retry' }, { status: 500 });
  }
}
