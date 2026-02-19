import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: parentId } = await params;

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
        { error: 'A public profile is required to reply' },
        { status: 403 }
      );
    }

    // Verify the parent comment exists, belongs to a published document,
    // and is itself a top-level comment (enforce max 2 levels of threading)
    const { data: parentComment } = await supabase
      .from('document_comments')
      .select('id, document_id, parent_id')
      .eq('id', parentId)
      .single();

    if (!parentComment) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
    }

    if (parentComment.parent_id !== null) {
      return NextResponse.json(
        { error: 'Replies can only be made to top-level comments' },
        { status: 422 }
      );
    }

    // Verify the document is still published
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', parentComment.document_id)
      .eq('status', 'published')
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const trimmed = content.trim();
    if (trimmed.length < 1 || trimmed.length > 500) {
      return NextResponse.json(
        { error: 'Reply must be between 1 and 500 characters' },
        { status: 400 }
      );
    }

    const { data: reply, error } = await supabase
      .from('document_comments')
      .insert({
        document_id: parentComment.document_id,
        author_id: user.id,
        content: trimmed,
        parent_id: parentId,
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
          ...reply,
          reply_count: 0,
          reactions: { thumbs_up: 0, thumbs_down: 0, user_reaction: null },
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Reply post error:', error);
    return NextResponse.json(
      { error: 'Failed to post reply' },
      { status: 500 }
    );
  }
}