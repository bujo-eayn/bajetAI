'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ExtractionStatus, ExtractionErrorType } from '@/types';

type Document = {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  file_url: string;
  status: string;
  created_at: string;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  extraction_error_type: ExtractionErrorType | null;
  extraction_page_count: number | null;
  extraction_char_count: number | null;
  uploader: {
    full_name: string | null;
    email: string;
  };
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter
        ? `/api/documents?status=${filter}`
        : '/api/documents';

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Supabase Realtime subscription for document updates
  useEffect(() => {
    const supabase = createClient();

    // Subscribe to document changes
    const channel = supabase
      .channel('documents-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
        },
        (payload) => {
          console.log('Realtime update received:', payload);

          // Update the specific document in our local state
          setDocuments((prevDocs) =>
            prevDocs.map((doc) =>
              doc.id === payload.new.id
                ? {
                    ...doc,
                    extraction_status: payload.new.extraction_status,
                    extraction_error: payload.new.extraction_error,
                    extraction_error_type: payload.new.extraction_error_type,
                    extraction_page_count: payload.new.extraction_page_count,
                    extraction_char_count: payload.new.extraction_char_count,
                    status: payload.new.status,
                  }
                : doc
            )
          );
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeleting(id);
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      // Remove document from list
      setDocuments(documents.filter((doc) => doc.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const handleRetryExtraction = async (id: string) => {
    if (!confirm('Retry text extraction for this document?')) {
      return;
    }

    try {
      setRetrying(id);
      const response = await fetch(`/api/documents/${id}/retry-extraction`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry extraction');
      }

      // Update local state to show pending status
      setDocuments((prevDocs) =>
        prevDocs.map((doc) =>
          doc.id === id
            ? { ...doc, extraction_status: 'pending' as ExtractionStatus }
            : doc
        )
      );

      alert('Extraction retry queued successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to retry extraction');
    } finally {
      setRetrying(null);
    }
  };

  const getExtractionStatusBadge = (document: Document) => {
    const status = document.extraction_status;

    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
            ⏳ Pending
          </span>
        );
      case 'extracting':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            <svg
              className="h-3 w-3 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Extracting...
          </span>
        );
      case 'completed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                ✓ Extracted
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {document.extraction_page_count || 0} pages,{' '}
                {document.extraction_char_count?.toLocaleString() || 0} chars
              </p>
            </TooltipContent>
          </Tooltip>
        );
      case 'failed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                ✗ Failed
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">{document.extraction_error_type}</p>
              <p className="text-xs">{document.extraction_error}</p>
            </TooltipContent>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');

    setDocuments((prevDocs) => {
      const sorted = [...prevDocs].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? dateA - dateB : dateB - dateA;
      });
      return sorted;
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const truncateTitle = (title: string) => {
    const words = title.trim().split(/\s+/);
    if (words.length > 3) {
      return words.slice(0, 3).join(' ') + '...';
    }
    return title;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage uploaded budget documents
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Upload Document
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            filter === ''
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('processing')}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            filter === 'processing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Processing
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            filter === 'published'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setFilter('archived')}
          className={`rounded-md px-3 py-1 text-sm font-medium ${
            filter === 'archived'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Archived
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-gray-600">Loading documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No documents
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a new document.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/upload"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Upload Document
            </Link>
          </div>
        </div>
      ) : (
        <TooltipProvider>
          <div className="overflow-x-auto bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-6">
                    Title
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    Extraction Status
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    Size
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    <button
                      onClick={handleSortToggle}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Uploaded
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortOrder === 'desc' ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {documents.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 sm:px-6">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default">
                            <div className="text-sm font-medium text-gray-900">
                              {truncateTitle(document.title)}
                            </div>
                            <div className="truncate text-sm text-gray-500">
                              {document.uploader.full_name ||
                                document.uploader.email}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p className="font-medium">{document.title}</p>
                          <p className="text-xs text-gray-400">
                            by{' '}
                            {document.uploader.full_name ||
                              document.uploader.email}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-4 sm:px-4">
                      {getExtractionStatusBadge(document)}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500 sm:px-4">
                      {formatFileSize(document.file_size)}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500 sm:px-4">
                      {formatDateTime(document.created_at)}
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-medium sm:px-6">
                      <div className="flex justify-end space-x-2">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View PDF
                        </a>

                        {/* View Text button (only if extraction completed) */}
                        {document.extraction_status === 'completed' && (
                          <Link
                            href={`/dashboard/documents/${document.id}/text`}
                            className="text-green-600 hover:text-green-900"
                          >
                            View Text
                          </Link>
                        )}

                        {/* Retry button (only if extraction failed) */}
                        {document.extraction_status === 'failed' && (
                          <button
                            onClick={() => handleRetryExtraction(document.id)}
                            disabled={retrying === document.id}
                            className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          >
                            {retrying === document.id ? 'Retrying...' : 'Retry'}
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(document.id)}
                          disabled={deleting === document.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleting === document.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
