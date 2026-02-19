'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

/**
 * ChatMessage component
 *
 * Renders a single chat message bubble with appropriate styling
 * based on whether it's from the user or assistant.
 */
export function ChatMessage({
  role,
  content,
  isLoading,
}: ChatMessageProps) {
  const isUser = role === 'user';

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
