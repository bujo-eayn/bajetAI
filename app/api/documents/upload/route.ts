import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest, INNGEST_EVENTS } from '@/lib/inngest/client';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes (reduced from 50MB for Phase 4)
const WARNING_FILE_SIZE = 10 * 1024 * 1024; // 10MB warning threshold
const ALLOWED_FILE_TYPE = 'application/pdf';
const PDF_MAGIC_BYTES = '%PDF'; // First 4 bytes of a valid PDF file

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
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

    // Check if user is an official
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'official') {
      return NextResponse.json(
        { error: 'Only officials can upload documents.' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document title is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== ALLOWED_FILE_TYPE) {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (20MB max for Phase 4 extraction)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB. Please compress your PDF.' },
        { status: 400 }
      );
    }

    // Validate PDF magic bytes (first 4 bytes should be "%PDF")
    const fileBuffer = await file.arrayBuffer();
    const header = new TextDecoder().decode(fileBuffer.slice(0, 4));
    if (header !== PDF_MAGIC_BYTES) {
      return NextResponse.json(
        { error: 'Invalid PDF file. File does not appear to be a valid PDF.' },
        { status: 400 }
      );
    }

    // Check if PDF is encrypted (basic check)
    const fileContent = new TextDecoder().decode(fileBuffer.slice(0, 1024));
    if (fileContent.includes('/Encrypt')) {
      return NextResponse.json(
        {
          error:
            'Password-protected PDFs are not supported. Please remove password protection and try again.',
        },
        { status: 400 }
      );
    }

    // Recreate File object from buffer for upload
    const validatedFile = new File([fileBuffer], file.name, { type: file.type });

    // Generate unique file name
    const timestamp = Date.now();
    const fileExt = 'pdf';
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `documents/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, validatedFile, {
        contentType: validatedFile.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(filePath);

    // Save document metadata to database
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title: title.trim(),
        file_url: publicUrl,
        file_name: fileName,
        file_size: file.size,
        uploaded_by: user.id,
        status: 'processing',
        processed: false,
        extraction_status: 'pending', // Phase 4: Initial extraction status
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Try to delete the uploaded file since DB insert failed
      await supabase.storage.from('documents').remove([filePath]);

      return NextResponse.json(
        { error: 'Failed to save document metadata' },
        { status: 500 }
      );
    }

    // Phase 4: Trigger background extraction via Inngest
    // Fire-and-forget - don't await this
    inngest
      .send({
        name: INNGEST_EVENTS.DOCUMENT_UPLOADED,
        data: {
          documentId: document.id,
          fileName: fileName,
          fileSize: file.size,
          fileUrl: publicUrl,
        },
      })
      .catch((error) => {
        console.error('Failed to send Inngest event:', error);
        // Don't fail the upload if Inngest event fails
        // User can manually retry extraction later
      });

    // Determine response message based on file size
    const isLargeFile = file.size > WARNING_FILE_SIZE;
    const message = isLargeFile
      ? 'Document uploaded successfully. Extraction started (may take 1-2 minutes for large files).'
      : 'Document uploaded successfully. Text extraction started.';

    return NextResponse.json(
      {
        message,
        document,
        isLargeFile,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
