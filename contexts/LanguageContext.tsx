'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'sw';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations object with EN and SW
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.mobileMenu': 'Navigation',
    'nav.participate': 'Participate',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.main': 'Main navigation',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',

    // Search
    'search.placeholder': 'Search documents...',
    'search.label': 'Search',
    'search.button': 'Search',

    // Document
    'document.published': 'Published',
    'document.updated': 'Updated',
    'document.pages': 'pages',
    'document.summaryAvailable': 'AI Summary Available',
    'document.viewDocument': 'View Document',
    'document.readSummary': 'Read Summary',
    'document.downloadPdf': 'Download PDF',
    'document.share': 'Share',
    'document.notFound': 'Document not found',

    // Summary
    'summary.title': 'AI-Generated Summary',
    'summary.confidence': 'Confidence',
    'summary.readingTime': 'min read',
    'summary.language': 'Summary Language',
    'summary.selectLanguage': 'Select language',

    // Tabs
    'tabs.summary': 'Summary',
    'tabs.fullDocument': 'Full Document',
    'tabs.comments': 'Comments',

    // PDF Viewer
    'pdf.loading': 'Loading document...',
    'pdf.error': 'Failed to load PDF',
    'pdf.downloadPrompt': 'Download PDF to view on mobile',
    'pdf.openInNewTab': 'Open in New Tab',

    // Share
    'share.title': 'Share Document',
    'share.copyLink': 'Copy Link',
    'share.linkCopied': 'Link copied to clipboard!',
    'share.qrCode': 'QR Code',
    'share.social': 'Share on social media',

    // Filters
    'filter.all': 'All',
    'filter.published': 'Published',
    'filter.archived': 'Archived',
    'filter.label': 'Filter',
    'sort.label': 'Sort',
    'sort.newest': 'Newest First',
    'sort.oldest': 'Oldest First',
    'sort.titleAsc': 'Title A-Z',
    'sort.titleDesc': 'Title Z-A',

    // Pagination
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.page': 'Page',
    'pagination.of': 'of',
    'pagination.showing': 'Showing',
    'pagination.results': 'results',

    // Status
    'status.active': 'Active',
    'status.comingSoon': 'Coming Soon',
    'status.pending': 'Pending',
    'status.processing': 'Processing',
    'status.completed': 'Completed',
    'status.failed': 'Failed',

    // Actions
    'action.notifyMe': 'Notify Me',
    'action.viewDocs': 'View Documents',
    'action.back': 'Back',
    'action.submit': 'Submit',
    'action.cancel': 'Cancel',

    // Coming Soon
    'comingSoon.title': 'Coming Soon',
    'comingSoon.description': "We're working on bringing you this participation area. Get notified when it launches.",
    'comingSoon.expectedLaunch': 'Expected Launch',
    'comingSoon.emailPlaceholder': 'Enter your email...',
    'comingSoon.backToAreas': 'Back to All Participation Areas',
    'comingSoon.successMessage': "You'll be notified when {area} launches!",
    'comingSoon.errorMessage': 'Failed to subscribe. Please try again.',

    // Homepage
    'home.hero.title': 'Empowering Citizen Participation',
    'home.hero.subtitle': 'Your Voice in Government Decisions - From Policy Planning to Healthcare, Education to Infrastructure',
    'home.hero.getStarted': 'Start Participating',
    'home.hero.learnMore': 'Learn More',
    'home.areas.title': 'Active Participation Areas',
    'home.stats.documents': 'Documents',
    'home.stats.comments': 'Comments',
    'home.stats.users': 'Users',

    // Participation Areas
    'area.budgeting.title': 'Budget & Finance',
    'area.budgeting.description': 'Review government budgets, financial plans, and expenditure reports. Share your priorities and suggestions.',
    'area.planning.title': 'Urban & Rural Planning',
    'area.planning.description': 'Participate in development planning, zoning decisions, and infrastructure projects for your community.',
    'area.healthcare.title': 'Healthcare Services',
    'area.healthcare.description': 'Share feedback on healthcare policies, hospital services, and public health initiatives.',
    'area.education.title': 'Education System',
    'area.education.description': 'Contribute ideas for improving schools, curriculum, and educational access across Kenya.',
    'area.transport.title': 'Transport & Infrastructure',
    'area.transport.description': 'Help shape decisions on roads, public transit, and transport infrastructure development.',

    // Footer
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.accessibility': 'Accessibility',
    'footer.copyright': '© 2025 bajetAI - iLabAfrica',

    // Errors
    'error.somethingWentWrong': 'Something went wrong',
    'error.tryAgain': 'Try again',
    'error.notFound': 'Not found',
  },
  sw: {
    // Navigation
    'nav.home': 'Nyumbani',
    'nav.mobileMenu': 'Urambazaji',
    'nav.participate': 'Shiriki',
    'nav.about': 'Kuhusu',
    'nav.contact': 'Wasiliana',
    'nav.main': 'Urambazaji mkuu',
    'nav.openMenu': 'Fungua menyu',
    'nav.closeMenu': 'Funga menyu',

    // Search
    'search.placeholder': 'Tafuta hati...',
    'search.label': 'Tafuta',
    'search.button': 'Tafuta',

    // Document
    'document.published': 'Imechapishwa',
    'document.updated': 'Imeboreshwa',
    'document.pages': 'kurasa',
    'document.summaryAvailable': 'Muhtasari wa AI Unapatikana',
    'document.viewDocument': 'Angalia Hati',
    'document.readSummary': 'Soma Muhtasari',
    'document.downloadPdf': 'Pakua PDF',
    'document.share': 'Shiriki',
    'document.notFound': 'Hati haijapatikana',

    // Summary
    'summary.title': 'Muhtasari Uliozalishwa na AI',
    'summary.confidence': 'Uaminifu',
    'summary.readingTime': 'dakika kusoma',
    'summary.language': 'Lugha ya Muhtasari',
    'summary.selectLanguage': 'Chagua lugha',

    // Tabs
    'tabs.summary': 'Muhtasari',
    'tabs.fullDocument': 'Hati Kamili',
    'tabs.comments': 'Maoni',

    // PDF Viewer
    'pdf.loading': 'Inapakia hati...',
    'pdf.error': 'Imeshindwa kupakia PDF',
    'pdf.downloadPrompt': 'Pakua PDF ili kuangalia kwenye simu',
    'pdf.openInNewTab': 'Fungua Kwenye Kichupo Kipya',

    // Share
    'share.title': 'Shiriki Hati',
    'share.copyLink': 'Nakili Kiungo',
    'share.linkCopied': 'Kiungo kimenakiliwa kwenye ubao wa kunakili!',
    'share.qrCode': 'Msimbo wa QR',
    'share.social': 'Shiriki kwenye mitandao ya kijamii',

    // Filters
    'filter.all': 'Zote',
    'filter.published': 'Zilizochapishwa',
    'filter.archived': 'Zimehifadhiwa',
    'filter.label': 'Chuja',
    'sort.label': 'Panga',
    'sort.newest': 'Mpya Kwanza',
    'sort.oldest': 'Za Zamani Kwanza',
    'sort.titleAsc': 'Kichwa A-Z',
    'sort.titleDesc': 'Kichwa Z-A',

    // Pagination
    'pagination.previous': 'Iliyotangulia',
    'pagination.next': 'Ifuatayo',
    'pagination.page': 'Ukurasa',
    'pagination.of': 'ya',
    'pagination.showing': 'Inaonyesha',
    'pagination.results': 'matokeo',

    // Status
    'status.active': 'Inapatikana',
    'status.comingSoon': 'Inakuja Hivi Karibuni',
    'status.pending': 'Inasubiri',
    'status.processing': 'Inashughulika',
    'status.completed': 'Imekamilika',
    'status.failed': 'Imeshindwa',

    // Actions
    'action.notifyMe': 'Nijulishe',
    'action.viewDocs': 'Angalia Hati',
    'action.back': 'Rudi',
    'action.submit': 'Wasilisha',
    'action.cancel': 'Ghairi',

    // Coming Soon
    'comingSoon.title': 'Inakuja Hivi Karibuni',
    'comingSoon.description': 'Tunafanya kazi kuleta eneo hili la ushiriki. Pata taarifa litakapozinduliwa.',
    'comingSoon.expectedLaunch': 'Kuzinduliwa Inatarajiwa',
    'comingSoon.emailPlaceholder': 'Weka barua pepe yako...',
    'comingSoon.backToAreas': 'Rudi kwa Maeneo Yote ya Ushiriki',
    'comingSoon.successMessage': 'Utajulishwa {area} litakapozinduliwa!',
    'comingSoon.errorMessage': 'Imeshindwa kujisajili. Tafadhali jaribu tena.',

    // Homepage
    'home.hero.title': 'Kuimarisha Ushiriki wa Raia',
    'home.hero.subtitle': 'Sauti Yako katika Maamuzi ya Serikali - Kutoka Mipango ya Sera hadi Afya, Elimu hadi Miundombinu',
    'home.hero.getStarted': 'Anza Kushiriki',
    'home.hero.learnMore': 'Jifunze Zaidi',
    'home.areas.title': 'Maeneo ya Ushiriki Yanayofanya Kazi',
    'home.stats.documents': 'Hati',
    'home.stats.comments': 'Maoni',
    'home.stats.users': 'Watumiaji',

    // Participation Areas
    'area.budgeting.title': 'Bajeti na Fedha',
    'area.budgeting.description': 'Kagua bajeti za serikali, mipango ya fedha, na ripoti za matumizi. Shiriki mapendeleo na mapendekezo yako.',
    'area.planning.title': 'Mipango ya Mijini na Vijijini',
    'area.planning.description': 'Shiriki katika mipango ya maendeleo, maamuzi ya eneo, na miradi ya miundombinu kwa jamii yako.',
    'area.healthcare.title': 'Huduma za Afya',
    'area.healthcare.description': 'Toa maoni kuhusu sera za afya, huduma za hospitali, na mipango ya afya ya umma.',
    'area.education.title': 'Mfumo wa Elimu',
    'area.education.description': 'Changia mawazo ya kuboresha shule, mtaala, na ufikiaji wa elimu nchini Kenya.',
    'area.transport.title': 'Usafiri na Miundombinu',
    'area.transport.description': 'Saidia kubuni maamuzi kuhusu barabara, usafiri wa umma, na maendeleo ya miundombinu ya usafiri.',

    // Footer
    'footer.about': 'Kuhusu',
    'footer.contact': 'Wasiliana',
    'footer.privacy': 'Faragha',
    'footer.terms': 'Masharti',
    'footer.accessibility': 'Ufikiaji',
    'footer.copyright': '© 2025 bajetAI - Serikali ya Kenya',

    // Errors
    'error.somethingWentWrong': 'Kuna kitu kimekosea',
    'error.tryAgain': 'Jaribu tena',
    'error.notFound': 'Haijapatikana',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bajetai-language') as Language | null;
      if (stored && (stored === 'en' || stored === 'sw')) {
        setLanguageState(stored);
      }
    }
  }, []);

  // Persist language preference and update HTML lang attribute
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bajetai-language', language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
