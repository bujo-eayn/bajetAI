'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactionCounts } from '@/types';

interface ReactionBarProps {
  counts: ReactionCounts;
  targetType: 'document_summary' | 'comment' | 'chat_response';
  targetId: string;
  onAuthRequired: () => void;
  isAuthenticated: boolean;
  /** Smaller layout for use inside comment cards */
  compact?: boolean;
}

export function ReactionBar({
  counts,
  targetType,
  targetId,
  onAuthRequired,
  isAuthenticated,
  compact = false,
}: ReactionBarProps) {
  const [local, setLocal] = useState<ReactionCounts>(counts);
  const [loading, setLoading] = useState(false);

  const handleReact = async (reactionType: 'thumbs_up' | 'thumbs_down') => {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    if (loading) return;

    // Optimistic update
    const prev = { ...local };
    const isSame = local.user_reaction === reactionType;
    const wasOther =
      !isSame && local.user_reaction !== null;

    setLocal({
      thumbs_up:
        reactionType === 'thumbs_up'
          ? isSame
            ? local.thumbs_up - 1
            : local.thumbs_up + 1
          : wasOther && local.user_reaction === 'thumbs_up'
          ? local.thumbs_up - 1
          : local.thumbs_up,
      thumbs_down:
        reactionType === 'thumbs_down'
          ? isSame
            ? local.thumbs_down - 1
            : local.thumbs_down + 1
          : wasOther && local.user_reaction === 'thumbs_down'
          ? local.thumbs_down - 1
          : local.thumbs_down,
      user_reaction: isSame ? null : reactionType,
    });

    setLoading(true);
    try {
      const res = await fetch('/api/public/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reaction_type: reactionType,
        }),
      });
      if (!res.ok) setLocal(prev);
    } catch {
      setLocal(prev);
    } finally {
      setLoading(false);
    }
  };

  const size = compact ? 'sm' : 'default';
  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size={size}
        className={cn(
          'gap-1.5 h-7 px-2',
          local.user_reaction === 'thumbs_up' &&
            'text-success bg-success/10 hover:bg-success/20'
        )}
        onClick={() => handleReact('thumbs_up')}
        disabled={loading}
        aria-label={`Helpful (${local.thumbs_up})`}
        aria-pressed={local.user_reaction === 'thumbs_up'}
      >
        <ThumbsUp className={iconClass} aria-hidden="true" />
        {local.thumbs_up > 0 && (
          <span className="text-xs tabular-nums">{local.thumbs_up}</span>
        )}
      </Button>

      <Button
        variant="ghost"
        size={size}
        className={cn(
          'gap-1.5 h-7 px-2',
          local.user_reaction === 'thumbs_down' &&
            'text-destructive bg-destructive/10 hover:bg-destructive/20'
        )}
        onClick={() => handleReact('thumbs_down')}
        disabled={loading}
        aria-label={`Not helpful (${local.thumbs_down})`}
        aria-pressed={local.user_reaction === 'thumbs_down'}
      >
        <ThumbsDown className={iconClass} aria-hidden="true" />
        {local.thumbs_down > 0 && (
          <span className="text-xs tabular-nums">{local.thumbs_down}</span>
        )}
      </Button>
    </div>
  );
}
