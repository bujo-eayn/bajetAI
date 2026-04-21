import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      content,
      document_id,
      parent_id = null,
      is_admin_response = false,
    } = body;

    // ✅ FIXED: remove author_id requirement
    if (!content || !document_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("document_comments") // ✅ FIXED TABLE
      .insert([
        {
          content,
          document_id,
          parent_id,
          is_admin_response, // ✅ IMPORTANT
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("DB ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}