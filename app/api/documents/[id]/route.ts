import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Fetch document with uploader info
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select(
        `
        *,
        uploader:profiles!documents_uploaded_by_fkey(
          id,
          full_name,
          email
        )
      `
      )
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Fetch document to check ownership
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('uploaded_by, file_name')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user owns the document
    if (document.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own documents' },
        { status: 403 }
      );
    }

    // Delete file from storage (using admin client for proper permissions)
    const adminClient = createAdminClient();
    const filePath = `documents/${document.file_name}`;
    const { error: storageError } = await adminClient.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      console.error('File path attempted:', filePath);
      // Continue with DB deletion even if storage deletion fails
    } else {
      console.log('Successfully deleted file from storage:', filePath);
    }

    // Delete document from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    const { status, title, summary_en } = body;

    // Fetch document to check ownership
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('uploaded_by')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user owns the document
    if (document.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only update your own documents' },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (status && ['processing', 'published', 'archived'].includes(status)) {
      updates.status = status;
    }
    if (title && title.trim().length > 0) {
      updates.title = title.trim();
    }
    if (summary_en !== undefined) {
      updates.summary_en = summary_en;
      // When manually updating summary, mark as completed if it has content
      if (summary_en && summary_en.trim().length > 0) {
        updates.summarization_status = 'completed';
        // Set confidence to 0.5 for manual summaries (to distinguish from AI)
        if (updates.summary_confidence === undefined) {
          updates.summary_confidence = 0.5;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update document
    const { data: updatedDocument, error: updateError } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Document updated successfully',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
