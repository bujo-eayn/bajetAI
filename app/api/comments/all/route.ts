import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1️⃣ Fetch all comments with author and document info
    const { data: commentsData, error: commentsError } = await supabase
      .from("document_comments")
      .select(`
        id,
        content,
        created_at,
        author:public_profiles(username),
        document:documents(id, title)
      `)
      .order("created_at", { ascending: false });

    if (commentsError) throw commentsError;

    const comments = commentsData ?? [];

    if (comments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2️⃣ Fetch reactions for all comment IDs
    const commentIds = comments.map((c) => c.id);

    const { data: reactionsData, error: reactionsError } = await supabase
      .from("reactions")
      .select(`target_id, reaction_type`)
      .in("target_id", commentIds)
      .eq("target_type", "comment");

    if (reactionsError) throw reactionsError;

    // 3️⃣ Attach reactions to each comment
    const commentsWithReactions = comments.map((comment) => {
      const reactions = reactionsData?.filter(
        (r) => r.target_id === comment.id
      ) ?? [];
      return { ...comment, reactions };
    });

    return NextResponse.json({ data: commentsWithReactions });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch comments and reactions" },
      { status: 500 }
    );
  }
}