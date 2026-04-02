"use client";

import { useEffect, useState } from "react";
import DocumentCard from "@/components/dashboard/DocumentCard";

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

const colors: Array<"purple" | "green" | "pink" | "blue" | "yellow"> = [
  "purple",
  "green",
  "pink",
  "blue",
  "yellow",
];

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

        console.log("API response:", data); // debug

        // Support both array response and { data: [...] }
        const allComments: Comment[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];

        // Group top-level comments by document
        const docMap: Record<string, DocumentSummary> = {};
        allComments.forEach((comment) => {
          if (!comment.parent_id) {
            const docId = comment.document?.id ?? `unknown-${comment.id}`;
            const docTitle = comment.document?.title ?? "Untitled";

            if (!docMap[docId]) {
              docMap[docId] = { id: docId, title: docTitle, commentCount: 1 };
            } else {
              docMap[docId].commentCount += 1;
            }
          }
        });

        setDocuments(Object.values(docMap));
      } catch (err: any) {
        console.error("Failed to fetch comments:", err);
        setError("Failed to load documents.");
        setDocuments([]); // important so map doesn't hang
      } finally {
        setLoading(false); // ✅ always clear loading
      }
    };

    fetchComments();
  }, []);

  if (loading)
    return <div className="p-8 text-gray-500 text-center">Loading documents...</div>;

  if (error)
    return <div className="p-8 text-red-500 text-center">{error}</div>;

  if (documents.length === 0)
    return <div className="p-8 text-center text-gray-500">No documents found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">
        Documents with Comments
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc, idx) => (
          <DocumentCard
            key={doc.id}
            title={doc.title ?? "Untitled"}
            comments={doc.commentCount}
            color={colors[idx % colors.length]}
            href={`/dashboard/comments/${doc.id}`} // title is clickable
          />
        ))}
      </div>
    </div>
  );
}