"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { username?: string | null } | null;
  document?: { id?: string; title?: string | null } | null;
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

        const allComments: Comment[] = data?.data ?? [];
        const filtered = allComments.filter((c) => c.document?.id === documentId);

        setComments(filtered);
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Comments for {comments[0]?.document?.title ?? "Untitled"}
      </h1>
      <p className="text-gray-500 mb-6">{comments.length} comment(s)</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Comment</th>
              <th className="p-4 text-left">Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <tr
                key={comment.id}
                className="hover:bg-gray-50 transition"
              >
                <td className="p-4 flex items-center gap-3">
                  {/* Avatar circle */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {comment.author?.username?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <span className="font-medium text-gray-800">
                    {comment.author?.username ?? "Unknown"}
                  </span>
                </td>

                <td className="p-4 text-gray-600">{comment.content}</td>

                <td className="p-4 text-sm text-gray-400">
                  {comment.created_at ? formatDate(comment.created_at) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}