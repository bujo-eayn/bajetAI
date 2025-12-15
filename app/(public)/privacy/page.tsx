'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('footer.privacy') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        <Breadcrumb items={breadcrumbs} />

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('footer.privacy')}</h1>
          <p className="text-muted-foreground">
            {language === 'en' ? 'Last updated: December 11, 2025' : 'Imesasishwa mwisho: Desemba 11, 2025'}
          </p>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">{language === 'en' ? 'Privacy Policy' : 'Sera ya Faragha'}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information while you engage with public matters on our platform.'
                : 'bajetAI imejitolea kulinda faragha yako. Sera hii ya Faragha inaelezea jinsi tunavyokusanya, kutumia, na kulinda taarifa zako unapotumia jukwaa letu kushiriki katika masuala ya umma.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Information We Collect' : 'Taarifa Tunazokusanya'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'We collect minimal information necessary to provide and improve our services, including usage data and language or category preferences.'
                : 'Tunakusanya taarifa kidogo zinazohitajika kutoa na kuboresha huduma zetu, ikiwemo data ya matumizi na mapendeleo ya lugha au kategoria.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'How We Use Your Information' : 'Jinsi Tunavyotumia Taarifa Zako'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'Your information is used to enhance your experience on bajetAI and to improve platform services. We do not sell or share personal information with third parties.'
                : 'Taarifa zako zinatumika kuboresha uzoefu wako kwenye bajetAI na kuimarisha huduma za jukwaa. Hatuuzi au kushiriki taarifa zako za kibinafsi na wahusika wa tatu.'}
            </p>
          </section>

          <section className="space-y-4 mt-8">
            <h3 className="text-xl font-semibold">{language === 'en' ? 'Contact Us' : 'Wasiliana Nasi'}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'If you have questions about this Privacy Policy, please contact us at privacy@bajetai.go.ke'
                : 'Ikiwa una maswali kuhusu Sera hii ya Faragha, tafadhali wasiliana nasi kwa privacy@bajetai.go.ke'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}