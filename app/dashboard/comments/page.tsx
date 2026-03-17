"use client";

import { useEffect, useState } from "react";

// Define the Comment type with optional chaining to prevent TS errors
type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { username?: string | null } | null;
  document?: { title?: string | null } | null;
};

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch("/api/comments/all");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setComments(data?.data ?? []);
      } catch (err: any) {
        console.error("Failed to fetch comments:", err);
        setError("Failed to load comments.");
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading comments...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (comments.length === 0) {
    return <div className="p-8 text-gray-500">No comments found.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Public Comments
      </h1>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Document</th>
                <th className="p-4 text-left">Comment</th>
                <th className="p-4 text-left">Time</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {comments.map((comment) => (
                <tr
                  key={comment.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* User */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                      {comment.author?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-gray-800 font-medium">
                      {comment.author?.username ?? "Unknown"}
                    </span>
                  </td>

                  {/* Document */}
                  <td className="p-4">
                    <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {comment.document?.title ?? "Untitled"}
                    </span>
                  </td>

                  {/* Comment */}
                  <td className="p-4 text-gray-700 max-w-md">{comment.content}</td>

                  {/* Time */}
                  <td className="p-4 text-sm text-gray-500">
                    {comment.created_at
                      ? new Date(comment.created_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}