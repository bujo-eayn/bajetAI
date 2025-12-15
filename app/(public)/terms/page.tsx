'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('footer.terms') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbs} />

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('footer.terms')}</h1>
          <p className="text-muted-foreground">
            {language === 'en' ? 'Last updated: December 11, 2025' : 'Imesasishwa mwisho: Desemba 11, 2025'}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">{language === 'en' ? 'Terms of Service' : 'Masharti ya Huduma'}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'By accessing and using bajetAI, you agree to comply with these Terms of Service and all applicable laws and regulations.'
                : 'Kwa kufikia na kutumia bajetAI, unakubali kufuata Masharti haya ya Huduma na sheria na kanuni zote zinazotumika.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Use of Service' : 'Matumizi ya Huduma'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI provides access to information on public matters and AI-generated summaries for informational purposes. The summaries are automatically generated and should not be considered official statements from any organization or institution.'
                : 'bajetAI inatoa ufikiaji wa taarifa kuhusu masuala ya umma na muhtasari uliozalishwa na AI kwa madhumuni ya habari. Muhtasari unazalishwa kiotomatiki na haipaswi kuchukuliwa kama taarifa rasmi kutoka shirika au taasisi yoyote.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Intellectual Property' : 'Mali ya Kimaarifa'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'All original materials remain the property of their respective owners. AI-generated summaries and platform features are provided as a public service.'
                : 'Vifaa vyote asili vinabaki mali ya wamiliki wake. Muhtasari uliozalishwa na AI na vipengele vya jukwaa vinatolewa kama huduma ya umma.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Disclaimer' : 'Kanusho'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'While we strive for accuracy, AI-generated summaries may contain errors or omissions. Users should refer to original sources for official information.'
                : 'Ingawa tunajitahidi kwa usahihi, muhtasari uliozalishwa na AI unaweza kuwa na makosa au mapungufu. Watumiaji wanapaswa kurejelea vyanzo vya asili kwa taarifa rasmi.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Contact' : 'Wasiliana'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'For questions about these Terms, please contact us at legal@bajetai.go.ke'
                : 'Kwa maswali kuhusu Masharti haya, tafadhali wasiliana nasi kwa legal@bajetai.go.ke'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}