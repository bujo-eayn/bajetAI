"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { username?: string | null } | null;
  document?: { id?: string; title?: string | null } | null; // ✅ FIXED
};

export default function DocumentCommentsPage() {
  const params = useParams();
  const documentId = params?.documentId as string; // ✅ ensure it's a string

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return; // ✅ guard

    const fetchComments = async () => {
      try {
        const res = await fetch("/api/comments/all");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const allComments: Comment[] = data?.data ?? [];

        const filtered = allComments.filter(
          (c) => c.document?.id === documentId
        );

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

  if (loading) return <div className="p-8 text-gray-500">Loading comments...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (comments.length === 0)
    return <div className="p-8 text-gray-500">No comments for this document.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Comments for {comments[0]?.document?.title ?? "Untitled"}
      </h1>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Comment</th>
              <th className="p-4 text-left">Time</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <tr key={comment.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">{comment.author?.username ?? "Unknown"}</td>
                <td className="p-4 text-gray-700">{comment.content}</td>
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
  );
}