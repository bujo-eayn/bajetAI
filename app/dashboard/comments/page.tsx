"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Comment = {
  id: string;
  parent_id?: string | null;
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

        // Group top-level comments by document
        const docMap: Record<string, DocumentSummary> = {};

        allComments.forEach((comment) => {
          if (!comment.parent_id) {
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
    return (
      <div className="p-8 text-gray-500 text-center">
        Loading documents...
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-red-500 text-center">{error}</div>
    );

  if (documents.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">
        No documents found.
      </div>
    );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Documents with Comments
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/dashboard/comments/${doc.id}`}
            className="group block"
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
              
              {/* ✅ Ellipsis applied here */}
              <h2
                className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition truncate"
                title={doc.title}
              >
                {doc.title}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                View comments for this document
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Top-level Comments
                </span>

                <span className="bg-blue-100 text-blue-700 text-sm font-semibold px-3 py-1 rounded-full">
                  {doc.commentCount}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}