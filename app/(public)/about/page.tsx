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
      <div className="space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('nav.about')}</h1>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'Empowering citizens to engage with government documents through AI-powered summaries and translations.'
              : 'Kuwezesha raia kushiriki na hati za serikali kupitia muhtasari na tafsiri zinazotumia AI.'}
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12 mt-12">
          {/* Mission */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Our Mission' : 'Dhamira Yetu'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI makes government documents accessible to all citizens by providing AI-powered summaries and translations. We believe that informed citizens make better decisions and contribute to stronger governance.'
                : 'bajetAI inafanya hati za serikali zipatikane kwa raia wote kwa kutoa muhtasari na tafsiri zinazotumia AI. Tunaamini kuwa raia wenye taarifa hufanya maamuzi bora na kuchangia utawala imara.'}
            </p>
          </section>

          {/* What We Do */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'What We Do' : 'Tunachofanya'}
              </h2>
            </div>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {language === 'en'
                  ? 'We process government documents to provide:'
                  : 'Tunachakata hati za serikali ili kutoa:'}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  {language === 'en'
                    ? 'AI-generated summaries in English and Swahili'
                    : 'Muhtasari uliozalishwa na AI kwa Kiingereza na Kiswahili'}
                </li>
                <li>
                  {language === 'en'
                    ? 'Easy access to full documents with built-in PDF viewers'
                    : 'Ufikiaji rahisi wa hati kamili zenye vionyeshi vya PDF vilivyojengwa'}
                </li>
                <li>
                  {language === 'en'
                    ? 'Search and filtering capabilities across document categories'
                    : 'Uwezo wa kutafuta na kuchuja katika kategoria za hati'}
                </li>
              </ul>
            </div>
          </section>

          {/* Who We Serve */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Who We Serve' : 'Tunawahudumia Nani'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI serves all citizens who want to understand and engage with government policies, budgets, and planning documents. Whether you are a student, researcher, journalist, or concerned citizen, we provide the tools to make complex documents more accessible.'
                : 'bajetAI inahudumia raia wote ambao wanataka kuelewa na kushiriki na sera za serikali, bajeti, na hati za mipango. Iwe wewe ni mwanafunzi, mtafiti, mwandishi wa habari, au raia mwenye wasiwasi, tunatoa zana za kufanya hati ngumu zipatikane zaidi.'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
