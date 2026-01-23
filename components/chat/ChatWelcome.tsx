'use client';

import { MessageSquare, FileText, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChatWelcomeProps {
  documentTitle: string;
  documentType?: string;
}

/**
 * ChatWelcome component
 *
 * Displays a welcome message when the chat is first opened.
 * Shows document context and usage hints.
 */
export function ChatWelcome({ documentTitle, documentType }: ChatWelcomeProps) {
  const { t, language } = useLanguage();

  // Get document type display name
  const getDocumentTypeDisplay = () => {
    if (!documentType) return null;

    const typeMap: Record<string, { en: string; sw: string }> = {
      CBROP: {
        en: 'County Budget Review and Outlook Paper',
        sw: 'Karatasi ya Mapitio na Mtazamo wa Bajeti ya Kaunti'
      },
      CFSP: {
        en: 'County Fiscal Strategy Paper',
        sw: 'Karatasi ya Mkakati wa Fedha ya Kaunti'
      },
      ADP: {
        en: 'Annual Development Plan',
        sw: 'Mpango wa Maendeleo wa Mwaka'
      },
    };

    const displayName = typeMap[documentType];
    if (!displayName) return documentType;

    return language === 'sw' ? displayName.sw : displayName.en;
  };

  const typeDisplay = getDocumentTypeDisplay();

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-lg">
          {t('chat.welcomeTitle')}
        </h3>

        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">{documentTitle}</span>
          </div>

          {typeDisplay && (
            <p className="text-xs">({typeDisplay})</p>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground max-w-xs">
        <p>{t('chat.welcomeDescription')}</p>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Globe className="h-3 w-3" aria-hidden="true" />
        <span>{t('chat.languageSupport')}</span>
      </div>

      {/* Example questions */}
      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-medium mb-2">{t('chat.exampleQuestions')}</p>
        <ul className="space-y-1 text-left">
          <li>&bull; {t('chat.exampleQuestion1')}</li>
          <li>&bull; {t('chat.exampleQuestion2')}</li>
          <li>&bull; {t('chat.exampleQuestion3')}</li>
        </ul>
      </div>
    </div>
  );
}
