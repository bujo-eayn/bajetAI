// API Route: Retry Extraction
// Allows manual retry of failed PDF text extractions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client';

const MAX_MANUAL_RETRIES = 2; // Maximum number of manual retries allowed

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();

    // 1. Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check if user is official
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'official') {
      return NextResponse.json(
        { error: 'Only officials can retry extraction' },
        { status: 403 }
      );
    }

    // 3. Get document and check extraction status
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, file_name, file_size, file_url, extraction_status')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // 4. Validate extraction status (can only retry failed extractions)
    if (document.extraction_status === 'completed') {
      return NextResponse.json(
        { error: 'Extraction already completed. No need to retry.' },
        { status: 400 }
      );
    }

    if (document.extraction_status === 'extracting') {
      return NextResponse.json(
        { error: 'Extraction is currently in progress. Please wait.' },
        { status: 400 }
      );
    }

    if (document.extraction_status === 'pending') {
      return NextResponse.json(
        {
          error:
            'Extraction is already queued. It will start automatically.',
        },
        { status: 400 }
      );
    }

    // 5. Reset extraction status to pending
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        extraction_status: 'pending',
        extraction_error: null,
        extraction_error_type: null,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset extraction status' },
        { status: 500 }
      );
    }

    // 6. Send Inngest event to trigger extraction
    try {
      await inngest.send({
        name: INNGEST_EVENTS.DOCUMENT_UPLOADED,
        data: {
          documentId: document.id,
          fileName: document.file_name,
          fileSize: document.file_size,
          fileUrl: document.file_url,
        },
      });
    } catch (inngestError) {
      console.error('Failed to send Inngest event:', inngestError);
      return NextResponse.json(
        { error: 'Failed to queue extraction job. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Extraction retry queued successfully',
      status: 'pending',
    });
  } catch (error) {
    console.error('Retry extraction error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
