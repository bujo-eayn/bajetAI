'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { ReactionBar } from '@/components/comments/ReactionBar';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  /** Ephemeral message id used as the reaction target_id */
  messageId?: string;
  onAuthRequired?: () => void;
  isAuthenticated?: boolean;
}

/**
 * ChatMessage component
 *
 * Renders a single chat message bubble with appropriate styling
 * based on whether it's from the user or assistant.
 * Assistant messages optionally show a ReactionBar.
 */
export function ChatMessage({
  role,
  content,
  isLoading,
  messageId,
  onAuthRequired,
  isAuthenticated = false,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const showReactions =
    !isUser && !isLoading && !!messageId && !!onAuthRequired;

  return (
    <div
      className={cn(
        'flex gap-3 w-full',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
      )}

      <div className="flex flex-col gap-1 max-w-[80%]">
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>

        {/* Reaction bar for assistant messages */}
        {showReactions && (
          <ReactionBar
            counts={{ thumbs_up: 0, thumbs_down: 0, user_reaction: null }}
            targetType="chat_response"
            targetId={messageId!}
            onAuthRequired={onAuthRequired!}
            isAuthenticated={isAuthenticated}
            compact
          />
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
