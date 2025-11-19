// API Route: Get Extracted Text
// Streams extracted text from Supabase Storage

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
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
        { error: 'Only officials can view extracted text' },
        { status: 403 }
      );
    }

    // 3. Get document and check if text is available
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, extraction_status, extracted_text_url')
      .eq('id', id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.extraction_status !== 'completed') {
      return NextResponse.json(
        {
          error: `Text extraction not completed. Status: ${document.extraction_status}`,
        },
        { status: 400 }
      );
    }

    if (!document.extracted_text_url) {
      return NextResponse.json(
        { error: 'Extracted text file not found' },
        { status: 404 }
      );
    }

    // 4. Download text from Storage using admin client
    const adminClient = createAdminClient();
    const { data: textFile, error: downloadError } = await adminClient.storage
      .from('extracted-text')
      .download(document.extracted_text_url);

    if (downloadError || !textFile) {
      console.error('Download error:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download extracted text' },
        { status: 500 }
      );
    }

    // 5. Convert Blob to text
    const text = await textFile.text();

    // 6. Return as plain text with caching headers
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': text.length.toString(),
      },
    });
  } catch (error) {
    console.error('Get text error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
