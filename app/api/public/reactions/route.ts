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
        { error: 'A public profile is required to react' },
        { status: 403 }
      );
    }

    const { target_type, target_id, reaction_type } = await request.json();

    const validTargetTypes = ['document_summary', 'comment', 'chat_response'];
    const validReactionTypes = ['thumbs_up', 'thumbs_down'];

    if (!validTargetTypes.includes(target_type)) {
      return NextResponse.json({ error: 'Invalid target_type' }, { status: 400 });
    }
    if (!validReactionTypes.includes(reaction_type)) {
      return NextResponse.json({ error: 'Invalid reaction_type' }, { status: 400 });
    }
    if (!target_id) {
      return NextResponse.json({ error: 'target_id is required' }, { status: 400 });
    }

    // Check if a reaction already exists for this user + target
    const { data: existing } = await supabase
      .from('reactions')
      .select('id, reaction_type')
      .eq('user_id', user.id)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .single();

    if (existing) {
      if (existing.reaction_type === reaction_type) {
        // Same reaction clicked again — toggle it off (remove)
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return NextResponse.json({ data: { action: 'removed' }, error: null });
      } else {
        // Different reaction — switch it
        const { error } = await supabase
          .from('reactions')
          .update({ reaction_type })
          .eq('id', existing.id);
        if (error) throw error;
        return NextResponse.json({ data: { action: 'updated' }, error: null });
      }
    }

    // No existing reaction — create new
    const { error } = await supabase.from('reactions').insert({
      user_id: user.id,
      target_type,
      target_id,
      reaction_type,
    });

    if (error) throw error;

    return NextResponse.json(
      { data: { action: 'created' }, error: null },
      { status: 201 }
    );
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json(
      { error: 'Failed to save reaction' },
      { status: 500 }
    );
  }
}