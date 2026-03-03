'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Eye, Keyboard, Languages, Contrast, AlertTriangle } from 'lucide-react';

export default function AccessibilityPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('footer.accessibility') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbs} />

        {/* Beta Notice */}
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-muted-foreground">
            {t('beta.bannerText')}{' '}
            <Link href="/beta" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              {t('beta.bannerLink')}
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('footer.accessibility')}</h1>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'Our commitment to making information on public matters accessible to everyone.'
              : 'Dhamira yetu ni kufanya taarifa kuhusu masuala ya umma zipatikane kwa kila mtu.'}
          </p>
        </div>

        <div className="space-y-8 mt-12">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Languages className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Multilingual Support' : 'Usaidizi wa Lugha Nyingi'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI provides content in English and Swahili, with AI-powered translations to ensure access for diverse audiences.'
                : 'bajetAI inatoa maudhui kwa Kiingereza na Kiswahili, pamoja na tafsiri zinazotumia AI kuhakikisha ufikiaji kwa hadhira mbalimbali.'}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Eye className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Screen Reader Compatible' : 'Inategemezana na Visomaji vya Skrini'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'The platform works with screen readers and assistive technologies using proper ARIA labels and semantic HTML.'
                : 'Jukwaa linafanya kazi na wasomaji wa skrini na teknolojia za kusaidia, likitumia lebo sahihi za ARIA na HTML ya kimantiki.'}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Keyboard className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Keyboard Navigation' : 'Urambazaji wa Kibodi'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'All interactive elements are operable via keyboard navigation for users who cannot use a mouse.'
                : 'Vipengele vyote vya mwingiliano vinaweza kuendeshwa kwa kutumia kibodi, kuhakikisha ufikiaji kwa watumiaji wasioweza kutumia kipanya.'}
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Contrast className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-semibold">
                {language === 'en' ? 'Visual Design' : 'Muundo wa Kuona'}
              </h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'High-contrast colors and clear typography ensure readability for users with visual impairments.'
                : 'Rangi zenye utofauti wa juu na maandishi wazi zinahakikisha usomaji kwa watumiaji wenye matatizo ya kuona.'}
            </p>
          </section>

          <section className="space-y-4 mt-12">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Feedback' : 'Maoni'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'We continuously improve accessibility. If you encounter barriers or have suggestions, contact us at accessibility@bajetai.go.ke'
                : 'Tunaendelea kuboresha ufikiaji. Ikiwa unakutana na vizuizi au una mapendekezo, tafadhali wasiliana nasi kwa accessibility@bajetai.go.ke'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}