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
    'search.placeholder': 'Search documents of public interest...',
    'search.label': 'Search',
    'search.button': 'Search',

    // Document
    'document.published': 'Published',
    'document.updated': 'Last Updated',
    'document.pages': 'pages',
    'document.summaryAvailable': 'AI Summary Available',
    'document.viewDocument': 'View Document',
    'document.readSummary': 'Read Summary',
    'document.downloadPdf': 'Download PDF',
    'document.share': 'Share',
    'document.notFound': 'Document not found',

    // Summary
    'summary.title': 'AI-Generated Summary',
    'summary.confidence': 'Confidence Level',
    'summary.readingTime': 'min read',
    'summary.language': 'Summary Language',
    'summary.selectLanguage': 'Select language',

    // Tabs
    'tabs.summary': 'Summary',
    'tabs.fullDocument': 'Full Document',
    'tabs.feedback': 'Public Feedback',

    // PDF Viewer
    'pdf.loading': 'Loading document...',
    'pdf.error': 'Unable to load document',
    'pdf.downloadPrompt': 'Download the PDF to view on mobile',
    'pdf.openInNewTab': 'Open in New Tab',

    // Share
    'share.title': 'Share Document',
    'share.copyLink': 'Copy Link',
    'share.linkCopied': 'Link copied to clipboard',
    'share.qrCode': 'QR Code',
    'share.social': 'Share via social platforms',

    // Filters
    'filter.all': 'All',
    'filter.published': 'Published',
    'filter.archived': 'Archived',
    'filter.label': 'Filter',
    'sort.label': 'Sort',
    'sort.newest': 'Newest First',
    'sort.oldest': 'Oldest First',
    'sort.titleAsc': 'Title A–Z',
    'sort.titleDesc': 'Title Z–A',

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
    'action.submitFeedback': 'Submit Feedback',
    'action.cancel': 'Cancel',

    // Coming Soon
    'comingSoon.title': 'Coming Soon',
    'comingSoon.description':
      'This participation area is under development. Get notified when it becomes available.',
    'comingSoon.expectedLaunch': 'Expected Launch',
    'comingSoon.emailPlaceholder': 'Enter your email address...',
    'comingSoon.backToAreas': 'Back to Participation Areas',
    'comingSoon.successMessage':
      'You will be notified when {area} becomes available.',
    'comingSoon.errorMessage':
      'Subscription failed. Please try again.',

    // Homepage
    'home.hero.title': 'Enhancing Public Participation',
    'home.hero.subtitle':
      'Engage with public-interest matters, understand key issues, and share your perspectives',
    'home.hero.getStarted': 'Start Participating',
    'home.hero.learnMore': 'Learn More',
    'home.areas.title': 'Participation Areas',
    'home.stats.documents': 'Documents',
    'home.stats.feedback': 'Feedback',
    'home.stats.users': 'Participants',

    // Participation Areas
    'area.budgeting.title': 'Budgets & Finance',
    'area.budgeting.description':
      'Review budgets, financial plans, and expenditure reports, and share your priorities.',
    'area.planning.title': 'Planning & Development',
    'area.planning.description':
      'Engage with development plans, land-use decisions, and infrastructure proposals.',
    'area.healthcare.title': 'Healthcare',
    'area.healthcare.description':
      'Provide feedback on healthcare services, policies, and public health initiatives.',
    'area.education.title': 'Education',
    'area.education.description':
      'Contribute ideas on education systems, curriculum, and access to learning.',
    'area.transport.title': 'Transport & Infrastructure',
    'area.transport.description':
      'Participate in discussions on transport systems and infrastructure development.',

    // Footer
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.accessibility': 'Accessibility',
    'footer.copyright':
      '© 2025 bajetAI – iLabAfrica',

    // Errors
    'error.somethingWentWrong': 'Something went wrong',
    'error.tryAgain': 'Please try again',
    'error.notFound': 'Not found',

    // Beta
    'beta.tag': 'BETA',
    'beta.pageTitle': 'Beta Release',
    'beta.navTooltip': 'Beta version – click for details',
    'beta.bannerText': 'This platform is currently in beta. Some features may change.',
    'beta.bannerLink': 'Learn more',

    // Chat
    'chat.title': 'Ask about this document',
    'chat.askQuestion': 'Ask a Question',
    'chat.inputPlaceholder': 'Type your question...',
    'chat.inputLabel': 'Question input',
    'chat.send': 'Send',
    'chat.sources': 'Sources',
    'chat.page': 'Page',
    'chat.welcomeTitle': 'How can I help you?',
    'chat.welcomeDescription': 'Ask me questions about this budget document. I can help you understand allocations, priorities, and financial details.',
    'chat.languageSupport': 'English & Swahili supported',
    'chat.exampleQuestions': 'Try asking:',
    'chat.exampleQuestion1': 'What is the total budget allocation?',
    'chat.exampleQuestion2': 'How much is allocated to education?',
    'chat.exampleQuestion3': 'What are the key priorities?',
    'chat.checkingStatus': 'Checking availability...',
    'chat.notAvailable': 'Chat not available',
    'chat.notAvailableDescription': 'Chat is not yet available for this document.',
    'chat.processingEmbeddings': 'Chat is being prepared. Please check back shortly.',
    'chat.embeddingsFailed': 'Chat could not be enabled for this document.',
    'chat.sendError': 'Failed to send message. Please try again.',
    'chat.statusError': 'Failed to check chat status.',
    'chat.disclaimerTitle': 'AI Disclaimer',
    'chat.disclaimer': 'AI-generated responses are for reference only. Please read the original document for official information.',
  },

  sw: {
    // Navigation
    'nav.home': 'Nyumbani',
    'nav.mobileMenu': 'Urambazaji',
    'nav.participate': 'Shiriki',
    'nav.about': 'Kuhusu',
    'nav.contact': 'Wasiliana',
    'nav.main': 'Urambazaji Mkuu',
    'nav.openMenu': 'Fungua Menyu',
    'nav.closeMenu': 'Funga Menyu',

    // Search
    'search.placeholder': 'Tafuta hati zenye maslahi ya umma...',
    'search.label': 'Tafuta',
    'search.button': 'Tafuta',

    // Document
    'document.published': 'Imechapishwa',
    'document.updated': 'Imesasishwa',
    'document.pages': 'kurasa',
    'document.summaryAvailable': 'Muhtasari wa AI Unapatikana',
    'document.viewDocument': 'Tazama Hati',
    'document.readSummary': 'Soma Muhtasari',
    'document.downloadPdf': 'Pakua PDF',
    'document.share': 'Shiriki',
    'document.notFound': 'Hati haijapatikana',

    // Summary
    'summary.title': 'Muhtasari Uliozalishwa na AI',
    'summary.confidence': 'Kiwango cha Uaminifu',
    'summary.readingTime': 'dakika kusoma',
    'summary.language': 'Lugha ya Muhtasari',
    'summary.selectLanguage': 'Chagua lugha',

    // Tabs
    'tabs.summary': 'Muhtasari',
    'tabs.fullDocument': 'Hati Kamili',
    'tabs.feedback': 'Maoni ya Umma',

    // PDF Viewer
    'pdf.loading': 'Inapakia hati...',
    'pdf.error': 'Imeshindwa kupakia hati',
    'pdf.downloadPrompt': 'Pakua PDF ili kuisoma kwenye simu',
    'pdf.openInNewTab': 'Fungua Kichupo Kipya',

    // Share
    'share.title': 'Shiriki Hati',
    'share.copyLink': 'Nakili Kiungo',
    'share.linkCopied': 'Kiungo kimenakiliwa',
    'share.qrCode': 'Msimbo wa QR',
    'share.social': 'Shiriki kupitia mitandao ya kijamii',

    // Filters
    'filter.all': 'Zote',
    'filter.published': 'Zilizochapishwa',
    'filter.archived': 'Zilizohifadhiwa',
    'filter.label': 'Chuja',
    'sort.label': 'Panga',
    'sort.newest': 'Mpya Kwanza',
    'sort.oldest': 'Za Zamani Kwanza',
    'sort.titleAsc': 'Kichwa A–Z',
    'sort.titleDesc': 'Kichwa Z–A',

    // Pagination
    'pagination.previous': 'Iliyotangulia',
    'pagination.next': 'Ifuatayo',
    'pagination.page': 'Ukurasa',
    'pagination.of': 'ya',
    'pagination.showing': 'Inaonyesha',
    'pagination.results': 'matokeo',

    // Status
    'status.active': 'Inatumika',
    'status.comingSoon': 'Inakuja Hivi Karibuni',
    'status.pending': 'Inasubiri',
    'status.processing': 'Inachakatwa',
    'status.completed': 'Imekamilika',
    'status.failed': 'Imeshindwa',

    // Actions
    'action.notifyMe': 'Nijulishe',
    'action.viewDocs': 'Tazama Hati',
    'action.back': 'Rudi',
    'action.submitFeedback': 'Wasilisha Maoni',
    'action.cancel': 'Ghairi',

    // Coming Soon
    'comingSoon.title': 'Inakuja Hivi Karibuni',
    'comingSoon.description':
      'Eneo hili la ushiriki bado linatengenezwa. Pata taarifa litakapopatikana.',
    'comingSoon.expectedLaunch': 'Kuzinduliwa Kunatarajiwa',
    'comingSoon.emailPlaceholder': 'Weka barua pepe yako...',
    'comingSoon.backToAreas': 'Rudi kwenye Maeneo ya Ushiriki',
    'comingSoon.successMessage':
      'Utajulishwa eneo la {area} litakapopatikana.',
    'comingSoon.errorMessage':
      'Usajili haukufanikiwa. Tafadhali jaribu tena.',

    // Homepage
    'home.hero.title': 'Kuimarisha Ushiriki wa Umma',
    'home.hero.subtitle':
      'Shiriki na hati za maslahi ya umma, elewa masuala muhimu, na toa maoni yako',
    'home.hero.getStarted': 'Anza Kushiriki',
    'home.hero.learnMore': 'Jifunze Zaidi',
    'home.areas.title': 'Maeneo ya Ushiriki',
    'home.stats.documents': 'Hati',
    'home.stats.feedback': 'Maoni',
    'home.stats.users': 'Washiriki',

    // Participation Areas
    'area.budgeting.title': 'Bajeti na Fedha',
    'area.budgeting.description':
      'Kagua bajeti, mipango ya fedha, na ripoti za matumizi, kisha toa mapendekezo yako.',
    'area.planning.title': 'Mipango na Maendeleo',
    'area.planning.description':
      'Shiriki katika mipango ya maendeleo, matumizi ya ardhi, na miradi ya miundombinu.',
    'area.healthcare.title': 'Afya',
    'area.healthcare.description':
      'Toa maoni kuhusu huduma za afya, sera, na mipango ya afya ya umma.',
    'area.education.title': 'Elimu',
    'area.education.description':
      'Changia mawazo kuhusu mfumo wa elimu, mitaala, na upatikanaji wa elimu.',
    'area.transport.title': 'Usafiri na Miundombinu',
    'area.transport.description':
      'Shiriki katika mijadala kuhusu mifumo ya usafiri na maendeleo ya miundombinu.',

    // Footer
    'footer.about': 'Kuhusu',
    'footer.contact': 'Wasiliana',
    'footer.privacy': 'Faragha',
    'footer.terms': 'Masharti',
    'footer.accessibility': 'Ufikiaji',
    'footer.copyright':
      '© 2025 bajetAI – iLabAfrica',

    // Errors
    'error.somethingWentWrong': 'Kuna hitilafu imetokea',
    'error.tryAgain': 'Tafadhali jaribu tena',
    'error.notFound': 'Haijapatikana',

    // Beta
    'beta.tag': 'BETA',
    'beta.pageTitle': 'Toleo la Beta',
    'beta.navTooltip': 'Toleo la beta – bonyeza kwa maelezo',
    'beta.bannerText': 'Jukwaa hili liko katika awamu ya beta. Baadhi ya vipengele vinaweza kubadilika.',
    'beta.bannerLink': 'Jifunze zaidi',

    // Chat
    'chat.title': 'Uliza kuhusu hati hii',
    'chat.askQuestion': 'Uliza Swali',
    'chat.inputPlaceholder': 'Andika swali lako...',
    'chat.inputLabel': 'Ingizo la swali',
    'chat.send': 'Tuma',
    'chat.sources': 'Vyanzo',
    'chat.page': 'Ukurasa',
    'chat.welcomeTitle': 'Naweza kukusaidiaje?',
    'chat.welcomeDescription': 'Niulize maswali kuhusu hati hii ya bajeti. Ninaweza kukusaidia kuelewa mgawanyo, vipaumbele, na maelezo ya fedha.',
    'chat.languageSupport': 'Kiingereza na Kiswahili vinasaidiwa',
    'chat.exampleQuestions': 'Jaribu kuuliza:',
    'chat.exampleQuestion1': 'Jumla ya mgawanyo wa bajeti ni kiasi gani?',
    'chat.exampleQuestion2': 'Kiasi gani kimetengwa kwa elimu?',
    'chat.exampleQuestion3': 'Vipaumbele vikuu ni vipi?',
    'chat.checkingStatus': 'Inakagua upatikanaji...',
    'chat.notAvailable': 'Mazungumzo hayapatikani',
    'chat.notAvailableDescription': 'Mazungumzo bado hayapatikani kwa hati hii.',
    'chat.processingEmbeddings': 'Mazungumzo yanatengenezwa. Tafadhali rudi baadaye.',
    'chat.embeddingsFailed': 'Mazungumzo hayakuweza kuwezeshwa kwa hati hii.',
    'chat.sendError': 'Imeshindwa kutuma ujumbe. Tafadhali jaribu tena.',
    'chat.statusError': 'Imeshindwa kukagua hali ya mazungumzo.',
    'chat.disclaimerTitle': 'Onyo la AI',
    'chat.disclaimer': 'Majibu yanayozalishwa na AI ni kwa marejeo tu. Tafadhali soma hati ya asili kwa taarifa rasmi.',
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
