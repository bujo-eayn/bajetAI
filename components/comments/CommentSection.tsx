'use client';

import { useState, useEffect, useCallback } from 'react';
import { CommentThread } from './CommentThread';
import { CommentInput } from './CommentInput';
import { PublicAuthModal } from '@/components/auth/PublicAuthModal';
import { Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import type { DocumentComment } from '@/types';

interface CommentSectionProps {
  documentId: string;
}

export function CommentSection({ documentId }: CommentSectionProps) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/public/documents/${documentId}/comments`
      );
      if (!res.ok) throw new Error('Failed to load');
      const { data } = await res.json();
      setComments(data ?? []);
    } catch {
      setError('Could not load comments. Please refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCommentPosted = (comment: DocumentComment) => {
    setComments((prev) => [...prev, comment]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New comment input */}
      <CommentInput
        documentId={documentId}
        onCommentPosted={handleCommentPosted}
      />

      {/* Comment list */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
          <MessageSquare className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs text-muted-foreground">
              Be the first to share your thoughts on this document.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted-foreground mb-4">
            {comments.length}{' '}
            {comments.length === 1 ? 'comment' : 'comments'}
          </p>
          <div>
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onAuthRequired={() => setAuthModalOpen(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Global auth modal triggered by reactions/reply clicks */}
      <PublicAuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </div>
  );
}