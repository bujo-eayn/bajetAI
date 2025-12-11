'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { ShareButton } from '@/components/molecules/ShareButton';
import { SummaryTab } from '@/components/organisms/SummaryTab';
import { PDFViewer } from '@/components/organisms/PDFViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate, formatFileSize } from '@/lib/i18n/formatters';
import { FileText, Calendar, Download, MessageSquare } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  publishedAt: string;
  pageCount: number;
  fileSize: string;
  fileUrl: string;
  summaryEn?: string | null;
  summarySw?: string | null;
  summaryConfidence?: number;
  uploader?: {
    fullName: string;
    role: string;
  };
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, language } = useLanguage();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [resolvedParams.id]);

  const fetchDocument = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/public/documents/${resolvedParams.id}`);

      if (!response.ok) {
        throw new Error('Document not found');
      }

      const data = await response.json();
      setDocument(data.data);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.participate'), href: '/' },
    { label: document?.title || '...' },
  ];

  const documentUrl = typeof window !== 'undefined' ? window.location.href : '';

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">{t('pdf.loading')}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !document) {
    return (
      <PublicLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-2xl font-bold">{t('document.notFound')}</h2>
          <p className="text-muted-foreground">{t('error.somethingWentWrong')}</p>
          <Button onClick={() => router.push('/participate')}>
            {t('action.back')}
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const hasSummary = !!(document.summaryEn || document.summarySw);

  return (
    <PublicLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Document Header */}
        <div className="space-y-4 border-b pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {t('document.published')}: {formatDate(new Date(document.publishedAt), language)}
                </span>
                <span>•</span>
                <span>{document.pageCount} {t('document.pages')}</span>
                <span>•</span>
                <span>PDF • {document.fileSize}</span>
              </div>

              {/* Summary Badge */}
              {hasSummary && (
                <Badge variant="success" className="gap-1">
                  <FileText className="h-3 w-3" aria-hidden="true" />
                  {t('document.summaryAvailable')}
                </Badge>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-2">
                <a href={document.fileUrl} download>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t('document.downloadPdf')}
                </a>
              </Button>
              <ShareButton url={documentUrl} title={document.title} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={hasSummary ? 'summary' : 'document'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" disabled={!hasSummary}>
              {t('tabs.summary')}
            </TabsTrigger>
            <TabsTrigger value="document">
              {t('tabs.fullDocument')}
            </TabsTrigger>
            <TabsTrigger value="comments" disabled className="gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t("tabs.comments")}
              <Badge variant="secondary" className="ml-1 text-xs">{t("status.comingSoon")}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <SummaryTab
              summaryEn={document.summaryEn}
              summarySw={document.summarySw}
              confidence={document.summaryConfidence}
            />
          </TabsContent>

          {/* Full Document Tab */}
          <TabsContent value="document" className="space-y-4">
            <PDFViewer fileUrl={document.fileUrl} title={document.title} />
          </TabsContent>

          {/* Comments Tab (Placeholder) */}
          <TabsContent value="comments" className="space-y-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <h3 className="mb-2 text-lg font-semibold">
                {language === 'en' ? 'Comments Coming Soon' : 'Maoni Yanakuja Hivi Karibuni'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'en'
                  ? 'Public commenting will be available in a future update.'
                  : 'Kutoa maoni kwa umma kutapatikana katika sasisho la baadaye.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PublicLayout>
  );
}
