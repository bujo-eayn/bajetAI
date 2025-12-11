'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, formatFileSize } from '@/lib/i18n/formatters';
import { FileText, Calendar, File, Check, ArrowRight } from 'lucide-react';

interface DocumentCardProps {
  id: string;
  title: string;
  publishedAt: string;
  pageCount: number;
  fileSize: string;
  hasSummary: boolean;
  summaryLanguages: ('en' | 'sw')[];
}

export function DocumentCard({
  id,
  title,
  publishedAt,
  pageCount,
  fileSize,
  hasSummary,
  summaryLanguages,
}: DocumentCardProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
      {/* Document Icon Header */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          {hasSummary && (
            <Badge variant="success" className="text-xs gap-1">
              <Check className="h-3 w-3" />
              {t('document.summaryAvailable')}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6 pt-4">
        {/* Title */}
        <h3 className="mb-3 text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          <Link href={`/participate/documents/${id}`} className="hover:underline">
            {title}
          </Link>
        </h3>

        {/* Metadata */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {t('document.published')}: {formatDate(new Date(publishedAt), language)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">
              {pageCount} {t('document.pages')} • PDF • {fileSize}
            </span>
          </div>
          {hasSummary && summaryLanguages.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-success">
                {summaryLanguages.map(lang => lang.toUpperCase()).join(' & ')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-2">
          <Button asChild size="sm" className="w-full sm:flex-1 group/btn">
            <Link href={`/participate/documents/${id}`}>
              {t('document.viewDocument')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" aria-hidden="true" />
            </Link>
          </Button>
          {hasSummary && (
            <Button asChild variant="outline" size="sm" className="w-full sm:flex-1">
              <Link href={`/participate/documents/${id}#summary`}>
                {t('document.readSummary')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
