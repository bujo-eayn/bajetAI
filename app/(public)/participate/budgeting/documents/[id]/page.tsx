'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { ShareButton } from '@/components/molecules/ShareButton';
import { SummaryTab } from '@/components/organisms/SummaryTab';
import { PDFViewer } from '@/components/organisms/PDFViewer';
import { CommentSection } from '@/components/comments/CommentSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/i18n/formatters';
import {
  FileText,
  Calendar,
  Download,
  MessageSquare,
  MoreVertical,
  BookOpen,
  Users,
} from 'lucide-react';

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

type TabName = 'summary' | 'document' | 'comments';

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { t, language } = useLanguage();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('summary');

  useEffect(() => {
    fetchDocument();
  }, [resolvedParams.id]);

  const fetchDocument = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/public/documents/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Document not found');
      const data = await response.json();
      setDocument(data.data);
      fetchCommentCount(resolvedParams.id);
    } catch (err) {
      console.error('Failed to fetch document:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommentCount = async (id: string) => {
    try {
      const res = await fetch(`/api/public/documents/${id}/comments?count=true`);
      if (res.ok) {
        const data = await res.json();
        setCommentCount(data.count ?? 0);
      }
    } catch {
      // non-critical
    }
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: t('nav.participate'), href: '/' },
    { label: t('area.budgeting.title'), href: '/participate/budgeting' },
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
          <Button onClick={() => router.push('/participate/budgeting')}>{t('action.back')}</Button>
        </div>
      </PublicLayout>
    );
  }

  const hasSummary = !!(document.summaryEn || document.summarySw);
  const initialTab: TabName = hasSummary ? 'summary' : 'document';

  if (activeTab === 'summary' && !hasSummary) {
    setActiveTab('document');
  }

  return (
    <PublicLayout className="pb-20 md:pb-8">
      {/* ── Mobile compact sticky header ── */}
      <div className="md:hidden sticky top-16 z-40 bg-background border-b -mx-4 px-4 py-2 flex items-center gap-2">
        <h1 className="flex-1 text-sm font-semibold truncate">{document.title}</h1>
        <ShareButton url={documentUrl} title={document.title} iconOnly />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={document.fileUrl} download className="flex items-center gap-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('document.downloadPdf')}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Desktop header ── */}
      <div className="hidden md:block space-y-4 border-b pb-6 mb-6">
        <Breadcrumb items={breadcrumbs} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{document.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                {t('document.published')}: {formatDate(new Date(document.publishedAt), language)}
              </span>
              <span>•</span>
              <span>{document.pageCount} {t('document.pages')}</span>
              <span>•</span>
              <span>PDF • {document.fileSize}</span>
            </div>
            {hasSummary && (
              <Badge variant="success" className="gap-1">
                <FileText className="h-3 w-3" aria-hidden="true" />
                {t('document.summaryAvailable')}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
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

      {/* ── Mobile breadcrumb ── */}
      <div className="md:hidden pt-2 pb-2">
        <Breadcrumb items={breadcrumbs} />
      </div>

      {/* ── Mobile tab content ── */}
      <div className="md:hidden">
        {activeTab === 'summary' && (
          <SummaryTab
            summaryEn={document.summaryEn}
            summarySw={document.summarySw}
            confidence={document.summaryConfidence}
            documentId={document.id}
          />
        )}
        {activeTab === 'document' && (
          <PDFViewer fileUrl={document.fileUrl} title={document.title} />
        )}
        {activeTab === 'comments' && (
          <CommentSection documentId={document.id} />
        )}
      </div>

      {/* ── Desktop tabs ── */}
      <div className="hidden md:block">
        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" disabled={!hasSummary}>
              {t('tabs.summary')}
            </TabsTrigger>
            <TabsTrigger value="document">
              {t('tabs.fullDocument')}
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t('tabs.comments')}
              {commentCount !== null && commentCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{commentCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <SummaryTab
              summaryEn={document.summaryEn}
              summarySw={document.summarySw}
              confidence={document.summaryConfidence}
              documentId={document.id}
            />
          </TabsContent>

          <TabsContent value="document" className="space-y-4">
            <PDFViewer fileUrl={document.fileUrl} title={document.title} />
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <CommentSection documentId={document.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex h-14"
        aria-label="Document sections"
      >
        <button
          onClick={() => setActiveTab('summary')}
          disabled={!hasSummary}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${activeTab === 'summary'
              ? 'text-primary font-medium'
              : 'text-muted-foreground'
            } disabled:opacity-40`}
        >
          <FileText className="h-5 w-5" aria-hidden="true" />
          {t('tabs.summary')}
        </button>
        <button
          onClick={() => setActiveTab('document')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${activeTab === 'document' ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          {t('tabs.fullDocument')}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors relative ${activeTab === 'comments' ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
        >
          <div className="relative">
            <Users className="h-5 w-5" aria-hidden="true" />
            {commentCount !== null && commentCount > 0 && (
              <span className="absolute -top-1 -right-2 h-4 min-w-4 px-0.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {commentCount > 99 ? '99+' : commentCount}
              </span>
            )}
          </div>
          {t('tabs.comments')}
        </button>
      </nav>
    </PublicLayout>
  );
}