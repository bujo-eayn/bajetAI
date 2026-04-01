"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Reaction = {
  target_id: string;
  reaction_type: "thumbs_up" | "thumbs_down";
};

type Comment = {
  id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  author?: { username?: string | null } | null;
  document?: { id?: string; title?: string | null } | null;
  reactions?: Reaction[];
  replies?: Comment[]; // ✅ supports nested comments
};

export default function DocumentCommentsPage() {
  const params = useParams();
  const documentId = params?.documentId as string;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const fetchComments = async () => {
      try {
        const res = await fetch("/api/comments/all");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const structuredComments: Comment[] = data?.data ?? [];

        // Filter only comments for this document
        const filtered = structuredComments.filter(
          (c) => c.document?.id === documentId
        );

        // Ensure reactions exist for all comments and replies
        const ensureReactions = (comments: Comment[]): Comment[] => {
          return comments.map((c) => ({
            ...c,
            reactions: c.reactions ?? [],
            replies: c.replies ? ensureReactions(c.replies) : [],
          }));
        };

        setComments(ensureReactions(filtered));
      } catch (err: any) {
        console.error(err);
        setError("Failed to load comments for this document.");
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [documentId]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return <div className="p-8 text-gray-500 text-center">Loading comments...</div>;

  if (error)
    return <div className="p-8 text-red-500 text-center">{error}</div>;

  if (comments.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">
        No comments for this document.
      </div>
    );

  const renderComment = (comment: Comment, level = 0) => {
    const thumbsUp =
      comment.reactions?.filter((r) => r.reaction_type === "thumbs_up").length ?? 0;

    const thumbsDown =
      comment.reactions?.filter((r) => r.reaction_type === "thumbs_down").length ?? 0;

    return (
      <div
        key={comment.id}
        className="mb-4 border-l border-gray-200 pl-4"
        style={{ marginLeft: level * 20 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
            {comment.author?.username?.[0]?.toUpperCase() ?? "U"}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">
                {comment.author?.username ?? "Unknown"}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(comment.created_at)}
              </span>
            </div>

            <p className="text-gray-600 mt-1">{comment.content}</p>

            <div className="mt-1 flex gap-3 text-sm text-gray-500">
              <span>👍 {thumbsUp}</span>
              <span>👎 {thumbsDown}</span>
            </div>
          </div>
        </div>

        {/* ✅ Recursive rendering of replies */}
        {comment.replies?.map((reply) =>
          renderComment(reply, level + 1)
        )}
      </div>
    );
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Comments for {comments[0]?.document?.title ?? "Untitled"}
      </h1>

      <p className="text-gray-500 mb-6">
        {comments.length} top-level comment(s)
      </p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}