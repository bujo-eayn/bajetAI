'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PublicAuthModal } from '@/components/auth/PublicAuthModal';
import { usePublicAuth } from '@/lib/auth/PublicAuthContext';
import { cn } from '@/lib/utils';
import { Lock, Loader2 } from 'lucide-react';
import type { DocumentComment } from '@/types';

interface CommentInputProps {
  documentId: string;
  parentId?: string;
  onCommentPosted: (comment: DocumentComment) => void;
  placeholder?: string;
  compact?: boolean;
}

const MAX_LENGTH = 500;

export function CommentInput({
  documentId,
  parentId,
  onCommentPosted,
  placeholder,
  compact = false,
}: CommentInputProps) {
  const { user, publicProfile } = usePublicAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const isAuthenticated = !!user && !!publicProfile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) { setAuthModalOpen(true); return; }
    if (!content.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const endpoint = parentId
        ? `/api/public/comments/${parentId}/reply`
        : '/api/public/comments';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to post');
      }

      const { data } = await res.json();
      setContent('');
      onCommentPosted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-dashed p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setAuthModalOpen(true)}
        >
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Join to comment</span>
            {' '}— enter your email for a magic link, no password needed.
          </p>
        </button>
        <PublicAuthModal
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          reason="to post a comment"
        />
      </>
    );
  }

  const nearLimit = content.length >= MAX_LENGTH * 0.9;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Commenting as</span>
        <span className="font-medium text-foreground">{publicProfile.username}</span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          placeholder ||
          (parentId ? 'Write a reply…' : 'Share your thoughts on this document…')
        }
        maxLength={MAX_LENGTH}
        rows={compact ? 2 : 3}
        className="resize-none"
        disabled={loading}
      />

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-xs tabular-nums',
            nearLimit ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {content.length}/{MAX_LENGTH}
        </span>
        {error && <p className="text-xs text-destructive flex-1 text-right">{error}</p>}
        <Button
          type="submit"
          size="sm"
          disabled={loading || !content.trim()}
          className="gap-2 shrink-0"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {parentId ? 'Reply' : 'Post'}
        </Button>
      </div>
    </form>
  );
}