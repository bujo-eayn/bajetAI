'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ChatSource } from '@/types';

interface ChatSourcesProps {
  sources: ChatSource[];
}

/**
 * ChatSources component
 *
 * Displays source citations from RAG retrieval.
 * Collapsible to save space in the chat interface.
 */
export function ChatSources({ sources }: ChatSourcesProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  // Sort by relevance score
  const sortedSources = [...sources].sort(
    (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
  );

  return (
    <div className="mt-2 text-xs">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <FileText className="h-3 w-3 mr-1" aria-hidden="true" />
        {t('chat.sources')} ({sources.length})
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 ml-1" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-1" aria-hidden="true" />
        )}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
          {sortedSources.map((source, index) => (
            <div
              key={`source-${index}`}
              className="text-muted-foreground"
            >
              <div className="flex items-center gap-2 flex-wrap">
                {source.pageNumber && (
                  <Badge variant="secondary" className="text-xs">
                    {t('chat.page')} {source.pageNumber}
                  </Badge>
                )}
                {source.sectionName && (
                  <Badge variant="outline" className="text-xs">
                    {source.sectionName}
                  </Badge>
                )}
              </div>
              {source.preview && (
                <p className="mt-1 text-xs italic line-clamp-2">
                  &ldquo;{source.preview}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
