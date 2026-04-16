"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  replies?: Comment[];
};

export default function DocumentCommentsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.documentId as string;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    fetchComments();
  }, [documentId]);

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/comments/all");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const structuredComments: Comment[] = data?.data ?? [];

      const ensureSafe = (comments: Comment[]): Comment[] =>
        comments.map((c) => ({
          ...c,
          reactions: c.reactions ?? [],
          replies: (c.replies ?? []).map((r) => ensureSafe([r])[0]),
        }));

      const filtered = structuredComments.filter(
        (c) => c.document?.id === documentId
      );

      setComments(ensureSafe(filtered));
    } catch (err) {
      console.error(err);
      setError("Failed to load comments for this document.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit reply to backend
  const handleReplySubmit = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);

      const res = await fetch("/api/comments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: replyText,
          author_id: "admin-user-id", 
          parent_id: parentId,
          document_id: documentId,
        }),
      });

      if (!res.ok) throw new Error("Failed to send reply");

      // Refresh comments
      await fetchComments();

      // Reset UI
      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getAvatarColor = (name: string = "U") => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-purple-100 text-purple-600",
      "bg-pink-100 text-pink-600",
      "bg-yellow-100 text-yellow-600",
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderComment = (comment: Comment, level = 0) => {
    const reactions = comment.reactions ?? [];
    const replies = comment.replies ?? [];

    const thumbsUp = reactions.filter(
      (r) => r.reaction_type === "thumbs_up"
    ).length;

    const thumbsDown = reactions.filter(
      (r) => r.reaction_type === "thumbs_down"
    ).length;

    const username = comment.author?.username ?? "Unknown";
    const avatarColor = getAvatarColor(username);

    return (
      <div
        key={comment.id}
        className={`py-3 ${level > 0 ? "pl-6 border-l border-gray-300 ml-6" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor}`}
          >
            {username?.[0]?.toUpperCase() ?? "U"}
          </div>

          <span className="text-sm font-medium text-gray-800">
            {username}
          </span>

          <span className="text-xs text-gray-400 ml-auto">
            {formatDate(comment.created_at)}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 mt-1 ml-11">
          {comment.content}
        </p>

        {/* Reactions + Reply */}
        <div className="flex gap-4 text-xs text-gray-500 mt-2 ml-11 items-center">
          <span>👍 {thumbsUp}</span>
          <span>👎 {thumbsDown}</span>

          <button
            onClick={() => setReplyingTo(comment.id)}
            className="text-blue-500 hover:underline"
          >
            Reply as Admin
          </button>
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="ml-11 mt-2">
            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReplySubmit(comment.id)}
                disabled={submitting}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Reply"}
              </button>

              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                className="px-3 py-1 bg-gray-200 text-xs rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2">
            {replies.map((reply) => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading)
    return <div className="p-8 text-center text-gray-500">Loading comments...</div>;

  if (error)
    return <div className="p-8 text-center text-red-500">{error}</div>;

  if (comments.length === 0)
    return <div className="p-8 text-center text-gray-500">No comments for this document.</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <button
        onClick={() => router.push("/dashboard/comments")}
        className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
      >
        Back
      </button>

      <h1 className="text-lg font-semibold text-gray-800 mb-4">
        Comments for {comments[0]?.document?.title ?? "Untitled"}
      </h1>

      <div>
        {comments.map((comment) => renderComment(comment))}
      </div>
    </div>
  );
}