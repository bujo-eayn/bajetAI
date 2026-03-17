"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author?: { username?: string | null } | null;
  document?: { id?: string; title?: string | null } | null;
};

type DocumentSummary = {
  id: string;
  title: string;
  commentCount: number;
};

export default function CommentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch("/api/comments/all");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const allComments: Comment[] = data?.data ?? [];

        // Group by document
        const docMap: Record<string, DocumentSummary> = {};

        allComments.forEach((comment) => {
          const docId = comment.document?.id ?? `unknown-${comment.id}`;
          const docTitle = comment.document?.title ?? "Untitled";

          if (!docMap[docId]) {
            docMap[docId] = {
              id: docId,
              title: docTitle,
              commentCount: 1,
            };
          } else {
            docMap[docId].commentCount += 1;
          }
        });

        setDocuments(Object.values(docMap));
      } catch (err: any) {
        console.error("Failed to fetch comments:", err);
        setError("Failed to load documents.");
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, []);

  if (loading)
    return <div className="p-8 text-gray-500">Loading documents...</div>;

  if (error)
    return <div className="p-8 text-red-500">{error}</div>;

  if (documents.length === 0)
    return <div className="p-8 text-gray-500">No documents found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Documents with Comments
      </h1>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
              <th className="p-4 text-left">Document</th>
              <th className="p-4 text-left">Comments</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="p-4">
                  <Link
                    href={`/dashboard/comments/${doc.id}`} // ✅ FIXED ROUTE
                    className="text-blue-600 font-medium hover:underline"
                  >
                    {doc.title}
                  </Link>
                </td>

                <td className="p-4 text-gray-700 font-medium">
                  {doc.commentCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}