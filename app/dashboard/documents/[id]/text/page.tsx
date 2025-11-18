'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TextReaderPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [text, setText] = useState<string>('');
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetchTextAndMetadata();
  }, [documentId]);

  const fetchTextAndMetadata = async () => {
    try {
      setLoading(true);

      // Fetch document metadata
      const metaResponse = await fetch(`/api/documents/${documentId}`);
      const metaData = await metaResponse.json();

      if (!metaResponse.ok) {
        throw new Error(metaData.error || 'Failed to fetch document');
      }

      setDocument(metaData.document);

      // Fetch extracted text
      const textResponse = await fetch(`/api/documents/${documentId}/text`);

      if (!textResponse.ok) {
        const errorData = await textResponse.json();
        throw new Error(errorData.error || 'Failed to fetch extracted text');
      }

      const extractedText = await textResponse.text();
      setText(extractedText);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      alert('Text copied to clipboard!');
    } catch (err) {
      alert('Failed to copy text');
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document?.title || 'document'}-extracted.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading extracted text...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="mb-4">
          <Link
            href="/dashboard/documents"
            className="text-blue-600 hover:text-blue-900"
          >
            ← Back to Documents
          </Link>
        </div>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="mb-4 text-sm">
            <ol className="flex items-center space-x-2">
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Dashboard
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li>
                <Link
                  href="/dashboard/documents"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Documents
                </Link>
              </li>
              <li className="text-gray-400">/</li>
              <li className="text-gray-900">Extracted Text</li>
            </ol>
          </nav>

          {/* Title and Actions */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {document?.title || 'Extracted Text'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {document?.extraction_page_count || 0} pages,{' '}
                {text.length.toLocaleString()} characters
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copying}
              >
                {copying ? 'Copying...' : 'Copy to Clipboard'}
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                Download .txt
              </Button>
              <Link href="/dashboard/documents">
                <Button variant="default">Back to Documents</Button>
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search in text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-md"
            />
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-6">
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-gray-800">
              {searchQuery ? getHighlightedText(text, searchQuery) : text}
            </pre>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 flex justify-between text-sm text-gray-500">
          <div>
            Document ID: <code className="text-xs">{documentId}</code>
          </div>
          <div>
            {searchQuery && (
              <span>
                Searching for: <strong>{searchQuery}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
