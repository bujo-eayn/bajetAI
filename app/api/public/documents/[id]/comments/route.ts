import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id: documentId } = await params;
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parent_id');
    const countOnly = searchParams.get('count') === 'true';

    // Verify document exists and is published
    const { data: doc } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('status', 'published')
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If only count is requested
    if (countOnly) {
      const { count, error } = await supabase
        .from('document_comments')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .is('parent_id', null);

      if (error) throw error;
      return NextResponse.json({ data: { count: count ?? 0 }, error: null });
    }

    // Build query — top-level or replies for a specific parent
    let query = supabase
      .from('document_comments')
      .select(
        `id, document_id, content, is_admin_response, created_at, updated_at, parent_id,
         author:public_profiles!document_comments_author_id_fkey(id, username)`
      )
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: comments, error } = await query;

    if (error) throw error;

    // Enrich each comment with reaction counts and reply count (top-level only)
    const enriched = await Promise.all(
      (comments ?? []).map(async (comment) => {
        const [reactionsResult, replyCountResult] = await Promise.all([
          supabase
            .from('reactions')
            .select('reaction_type')
            .eq('target_type', 'comment')
            .eq('target_id', comment.id),
          supabase
            .from('document_comments')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', comment.id),
        ]);
        const reactionData = reactionsResult.data ?? [];

        return {
          ...comment,
          reply_count: replyCountResult.count ?? 0,
          reactions: {
            thumbs_up: reactionData.filter((r) => r.reaction_type === 'thumbs_up').length,
            thumbs_down: reactionData.filter((r) => r.reaction_type === 'thumbs_down').length,
            user_reaction: null as 'thumbs_up' | 'thumbs_down' | null,
          },
        };
      })
    );

    return NextResponse.json({ data: enriched, error: null });
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load comments' },
      { status: 500 }
    );
  }
}
