'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { SearchBar } from '@/components/molecules/SearchBar';
import { DocumentCard } from '@/components/organisms/DocumentCard';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DocumentCategory } from '@/types';
import { FileText } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  publishedAt: string;
  pageCount: number;
  fileSize: string;
  fileUrl: string;
  hasSummary: boolean;
  summaryLanguages: ('en' | 'sw')[];
}

const categoryTitles: Record<DocumentCategory, { titleKey: string; descriptionKey: string }> = {
  budgeting: { titleKey: 'area.budgeting.title', descriptionKey: 'area.budgeting.description' },
  planning: { titleKey: 'area.planning.title', descriptionKey: 'area.planning.description' },
  healthcare: { titleKey: 'area.healthcare.title', descriptionKey: 'area.healthcare.description' },
  education: { titleKey: 'area.education.title', descriptionKey: 'area.education.description' },
  transport: { titleKey: 'area.transport.title', descriptionKey: 'area.transport.description' },
};

function ParticipateContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const category = (searchParams.get('category') || 'budgeting') as DocumentCategory;
  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  // Redirect if invalid category
  useEffect(() => {
    if (!categoryTitles[category]) {
      router.replace('/participate?category=budgeting');
    }
  }, [category, router]);

  useEffect(() => {
    fetchDocuments();
  }, [page, search, category]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        category: category,
        ...(search && { search }),
      });

      const response = await fetch(`/api/public/documents?${params}`);
      const data = await response.json();

      setDocuments(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const categoryConfig = categoryTitles[category] || categoryTitles.budgeting;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: t('nav.participate'), href: '/' },
    { label: t(categoryConfig.titleKey) },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t(categoryConfig.titleKey)}</h1>
          <p className="text-muted-foreground">{t(categoryConfig.descriptionKey)}</p>
        </div>

        {/* Search */}
        <SearchBar onSearch={handleSearch} defaultValue={search} />

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search ? (language === 'en' ? 'No documents found' : 'Hakuna hati zilizopatikana') : (language === 'en' ? 'No published documents' : 'Hakuna hati zilizochapishwa')}
            </h3>
            <p className="text-muted-foreground">
              {search ? (language === 'en' ? 'Try a different search term' : 'Jaribu neno lingine la utafutaji') : (language === 'en' ? 'Check back soon for new documents' : 'Rudi hivi karibuni kwa hati mpya')}
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-8">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                title={doc.title}
                publishedAt={doc.publishedAt}
                pageCount={doc.pageCount}
                fileSize={doc.fileSize}
                hasSummary={doc.hasSummary}
                summaryLanguages={doc.summaryLanguages}
              />
            ))}
          </div>
        )}

        {/* Simple Pagination Info */}
        {total > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            {t('pagination.showing')} {documents.length} of {total} {t('pagination.results')}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default function ParticipatePage() {
  return (
    <Suspense fallback={
      <PublicLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </PublicLayout>
    }>
      <ParticipateContent />
    </Suspense>
  );
}
