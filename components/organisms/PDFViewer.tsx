'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Download, ExternalLink, FileText } from 'lucide-react';

interface PDFViewerProps {
  fileUrl: string;
  title: string;
}

// Custom hook for responsive detection
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Create listener
    const listener = () => setMatches(media.matches);
    
    // Add listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }
    
    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
}

export function PDFViewer({ fileUrl, title }: PDFViewerProps) {
  const { t } = useLanguage();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Use proper media query hook that handles SSR and resizing
  const isMobile = useMediaQuery('(max-width: 767px)');

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
  };

  const handleOpenNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleDownload} variant="default" size="sm" className="gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          {t('document.downloadPdf')}
        </Button>
        <Button onClick={handleOpenNewTab} variant="outline" size="sm" className="gap-2">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t('pdf.openInNewTab')}
        </Button>
      </div>

      {/* PDF Viewer */}
      {isMobile ? (
        // Mobile: Show download prompt instead of embedded viewer
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <p className="mb-4 text-sm text-muted-foreground">
            {t('pdf.downloadPrompt')}
          </p>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('document.downloadPdf')}
          </Button>
        </div>
      ) : (
        // Desktop: Show embedded PDF viewer
        <div className="relative w-full rounded-lg border bg-muted/30">
          {loading && (
            <div className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">{t('pdf.loading')}</p>
              </div>
            </div>
          )}
          {error ? (
            <div className="flex h-[600px] flex-col items-center justify-center p-8">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
              <p className="mb-4 text-sm text-muted-foreground">{t('pdf.error')}</p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t('document.downloadPdf')}
              </Button>
            </div>
          ) : (
            <iframe
              src={fileUrl}
              title={title}
              className="h-[600px] w-full rounded-lg"
              onLoad={handleLoad}
              onError={handleError}
              style={{ display: loading ? 'none' : 'block' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
