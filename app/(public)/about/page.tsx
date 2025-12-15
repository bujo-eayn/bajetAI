'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Users, Target } from 'lucide-react';

export default function AboutPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.about') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-12">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('nav.about')}</h1>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'bajetAI is an agentic AI platform that enables meaningful public engagement with complex public-interest matters through summaries, translations, conversational access, and feedback intelligence.'
              : 'bajetAI ni jukwaa la akili bandia linalowawezesha wananchi kushiriki kikamilifu katika masuala changamano ya umma kwa kutumia muhtasari, tafsiri, mazungumzo, na uchambuzi wa mrejesho.'}
          </p>
        </div>

        {/* Mission */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">{language === 'en' ? 'Our Mission' : 'Dhamira Yetu'}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {language === 'en'
              ? 'bajetAI empowers the public and organizations to engage effectively with public-interest matters using AI-powered summaries, translations, interactive tools, and feedback intelligence. Informed participation leads to better outcomes for society.'
              : 'bajetAI huwawezesha wananchi na mashirika kushiriki kikamilifu katika masuala ya umma kwa kutumia muhtasari, tafsiri, zana shirikishi, na uchambuzi wa mrejesho unaotumia akili bandia (AI). Ushiriki wenye uelewa huleta matokeo bora kwa jamii.'}
          </p>
        </section>

        {/* What We Do */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">{language === 'en' ? 'What We Do' : 'Tunachofanya'}</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              {language === 'en'
                ? 'We simplify complex public-interest documents and provide tools that allow the public and organizations to engage meaningfully:'
                : 'Tunarahisisha hati changamano za umma na kutoa zana zinazowawezesha wananchi na mashirika kushiriki kikamilifu:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                {language === 'en'
                  ? 'AI-generated summaries and translations in English and Swahili'
                  : 'Muhtasari na tafsiri zinazozalishwa na AI kwa Kiingereza na Kiswahili'}
              </li>
              <li>
                {language === 'en'
                  ? 'Interactive access to full documents with built-in viewers'
                  : 'Ufikiaji shirikishi wa hati kamili kupitia vionyeshi vilivyojengwa ndani'}
              </li>
              <li>
                {language === 'en'
                  ? 'Conversational tools that let users ask questions and get clear answers from documents'
                  : 'Zana za mazungumzo zinazowawezesha watumiaji kuuliza maswali na kupata majibu wazi kutoka kwenye hati'}
              </li>
              <li>
                {language === 'en'
                  ? 'Feedback intelligence that summarizes public input by sentiment, topic, and key areas of interest'
                  : 'Uchambuzi wa mrejesho unaofupisha maoni ya umma kwa mujibu wa hisia, mada, na maeneo muhimu ya kipaumbele'}
              </li>
            </ul>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">{language === 'en' ? 'Who We Serve' : 'Tunawahudumia Nani'}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {language === 'en'
              ? 'bajetAI serves both the public and organizations seeking to understand, discuss, and contribute to matters of public interest. We make complex documents accessible, understandable, and participatory for all stakeholders.'
              : 'bajetAI inawahudumia wananchi na mashirika yanayotaka kuelewa, kujadili, na kuchangia masuala ya umma. Tunafanya hati changamano zipatikane, zieleweke, na kushirikisha umma kwa pande zote.'}
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
