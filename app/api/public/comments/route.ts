import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify caller has a public_profile (citizen)
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'A public profile is required to comment' },
        { status: 403 }
      );
    }

    const { document_id, content } = await request.json();

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      return NextResponse.json(
        { error: 'Comment must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    // Verify the document is published
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', document_id)
      .eq('status', 'published')
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from('document_comments')
      .insert({
        document_id,
        author_id: user.id,
        content: trimmed,
        parent_id: null,
        is_admin_response: false,
      })
      .select(
        `id, document_id, content, is_admin_response, created_at, updated_at, parent_id,
         author:public_profiles!document_comments_author_id_fkey(id, username)`
      )
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        data: {
          ...comment,
          reply_count: 0,
          reactions: { thumbs_up: 0, thumbs_down: 0, user_reaction: null },
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Comment post error:', error);
    return NextResponse.json(
      { error: 'Failed to post comment' },
      { status: 500 }
    );
  }
}
