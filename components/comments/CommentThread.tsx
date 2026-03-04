'use client';

import { useState } from 'react';
import { CommentCard } from './CommentCard';
import { Loader2 } from 'lucide-react';
import type { DocumentComment } from '@/types';

interface CommentThreadProps {
  comment: DocumentComment;
  onAuthRequired: () => void;
}

export function CommentThread({ comment, onAuthRequired }: CommentThreadProps) {
  const [replies, setReplies] = useState<DocumentComment[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const handleReplyPosted = async (reply: DocumentComment) => {
    // If replies haven't been fetched yet, load them first so existing replies show
    if (!repliesLoaded && (comment.reply_count ?? 0) > 0) {
      await loadReplies();
    }
    setReplies((prev) => {
      // Avoid duplicates if loadReplies already fetched this reply
      if (prev.some((r) => r.id === reply.id)) return prev;
      return [...prev, reply];
    });
    setRepliesLoaded(true);
  };

  const loadReplies = async () => {
    if (loadingReplies) return;
    setLoadingReplies(true);
    try {
      const res = await fetch(
        `/api/public/documents/${comment.document_id}/comments?parent_id=${comment.id}`
      );
      const { data } = await res.json();
      setReplies(data ?? []);
      setRepliesLoaded(true);
    } catch {
      // silently fail — reply count badge still visible
    } finally {
      setLoadingReplies(false);
    }
  };

  // CommentCard calls onReplyPosted when user clicks Reply and submits.
  // We also need to trigger loading existing replies when the thread expands.
  // We wrap handleReplyPosted and also load replies when the reply section opens.
  const handleReplyOpen = async () => {
    if (!repliesLoaded && (comment.reply_count ?? 0) > 0) {
      await loadReplies();
    }
  };

  return (
    <div className="space-y-3 py-4 border-b last:border-b-0">
      <CommentCard
        comment={comment}
        onAuthRequired={onAuthRequired}
        onReplyPosted={handleReplyPosted}
      />

      {/* Load replies when the reply button on CommentCard is toggled */}
      {/* We listen at thread level by watching replies array expansion */}
      {(comment.reply_count ?? 0) > 0 && !repliesLoaded && (
        <button
          type="button"
          className="ml-5 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={handleReplyOpen}
        >
          {loadingReplies ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading replies…
            </span>
          ) : (
            `View ${comment.reply_count} ${
              comment.reply_count === 1 ? 'reply' : 'replies'
            }`
          )}
        </button>
      )}

      {/* Rendered replies */}
      {replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          onAuthRequired={onAuthRequired}
          isReply
        />
      ))}
    </div>
  );
}