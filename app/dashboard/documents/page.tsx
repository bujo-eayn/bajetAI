'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Document = {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  file_url: string;
  status: string;
  created_at: string;
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

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
            <table className="min-w-full table-fixed divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[35%] px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-6">
                    Title
                  </th>
                  <th className="w-[15%] px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    Status
                  </th>
                  <th className="w-[12%] px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    Size
                  </th>
                  <th className="w-[18%] px-2 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-4">
                    Uploaded
                  </th>
                  <th className="w-[20%] px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 sm:px-6">
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
                              {document.uploader.full_name || document.uploader.email}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                          <p className="font-medium">{document.title}</p>
                          <p className="text-xs text-gray-400">
                            by {document.uploader.full_name || document.uploader.email}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-4 sm:px-4">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                          document.status
                        )}`}
                      >
                        {document.status}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500 sm:px-4">
                      <div className="truncate">
                        {formatFileSize(document.file_size)}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500 sm:px-4">
                      <div className="truncate">
                        {formatDate(document.created_at)}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-medium sm:px-6">
                      <div className="flex justify-end space-x-2 sm:space-x-4">
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </a>
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
