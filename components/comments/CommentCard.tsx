'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReactionBar } from './ReactionBar';
import { CommentInput } from './CommentInput';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePublicAuth } from '@/lib/auth/PublicAuthContext';
import { formatRelativeTime } from '@/lib/i18n/formatters';
import { cn } from '@/lib/utils';
import { User, Shield, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import type { DocumentComment } from '@/types';

interface CommentCardProps {
  comment: DocumentComment;
  onAuthRequired: () => void;
  onReplyPosted?: (reply: DocumentComment) => void;
  /** Visually indented, suppresses reply button (max 2 levels) */
  isReply?: boolean;
}

export function CommentCard({
  comment,
  onAuthRequired,
  onReplyPosted,
  isReply = false,
}: CommentCardProps) {
  const { language } = useLanguage();
  const { user, publicProfile } = usePublicAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const isAuthenticated = !!user && !!publicProfile;

  const replyCount = comment.reply_count ?? 0;

  return (
    <div className={cn('space-y-3', isReply && 'ml-5 border-l-2 border-muted pl-4')}>
      {/* Author row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-1.5">
          {comment.is_admin_response ? (
            <Shield className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm font-medium leading-none">
            {comment.author?.username ?? 'Anonymous'}
          </span>
        </div>

        {comment.is_admin_response && (
          <Badge variant="default" className="h-5 px-1.5 text-[10px]">
            Official Response
          </Badge>
        )}

        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(comment.created_at, language)}
        </span>
      </div>

      {/* Comment content */}
      <p className="text-sm leading-relaxed">{comment.content}</p>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <ReactionBar
          counts={
            comment.reactions ?? {
              thumbs_up: 0,
              thumbs_down: 0,
              user_reaction: null,
            }
          }
          targetType="comment"
          targetId={comment.id}
          onAuthRequired={onAuthRequired}
          isAuthenticated={isAuthenticated}
          compact
        />

        {/* Reply button — only on top-level comments */}
        {!isReply && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setReplyOpen((v) => !v)}
            aria-expanded={replyOpen}
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {replyCount > 0
              ? `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
              : 'Reply'}
            {replyCount > 0 &&
              (replyOpen ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              ))}
          </Button>
        )}
      </div>

      {/* Inline reply input */}
      {replyOpen && !isReply && (
        <div className="mt-2">
          <CommentInput
            documentId={comment.document_id}
            parentId={comment.id}
            onCommentPosted={(reply) => {
              onReplyPosted?.(reply);
              setReplyOpen(false);
            }}
            compact
          />
        </div>
      )}
    </div>
  );
}