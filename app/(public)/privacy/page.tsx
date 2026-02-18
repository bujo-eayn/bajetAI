'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, Shield } from 'lucide-react';

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

          <section className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="text-xl font-semibold">
                {language === 'en'
                  ? 'Data Handling During Beta – Kenya Data Protection Act 2019'
                  : 'Ushughulikiaji wa Data Wakati wa Beta – Sheria ya Ulinzi wa Data ya Kenya 2019'}
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'bajetAI operates in compliance with the Data Protection Act of Kenya (2019) (Cap. 411C). During the current beta phase, we collect limited data to enable functionality and improve the platform. All data processing is conducted lawfully, fairly, and transparently.'
                : 'bajetAI inafanya kazi kwa kuzingatia Sheria ya Ulinzi wa Data ya Kenya (2019) (Sura. 411C). Wakati wa awamu ya sasa ya beta, tunakusanya data ndogo ili kuwezesha utendaji na kuboresha jukwaa. Uchakataji wote wa data unafanywa kwa njia ya kisheria, ya haki, na ya uwazi.'}
            </p>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  {language === 'en' ? 'Beta Data Collection' : 'Ukusanyaji wa Data wa Beta'}
                </h4>
                <p>
                  {language === 'en'
                    ? 'During the beta phase we collect: anonymous usage analytics, browser-stored language preferences, temporary chat session tokens (stored in sessionStorage only, never on our servers), and voluntary feedback submissions.'
                    : 'Wakati wa awamu ya beta tunakusanya: takwimu za matumizi bila jina, mapendeleo ya lugha yaliyohifadhiwa kwenye kivinjari, tokeni za muda za kipindi cha mazungumzo (zimehifadhiwa katika sessionStorage tu, hazijawahi kwenye seva zetu), na mawasiliano ya maoni ya hiari.'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  {language === 'en'
                    ? 'Your Rights as a Data Subject (Kenya DPA 2019)'
                    : 'Haki Zako kama Mhusika wa Data (Sheria ya Kenya DPA 2019)'}
                </h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>{language === 'en' ? 'Right of access to your personal data (Section 26)' : 'Haki ya ufikiaji wa data yako ya kibinafsi (Kifungu cha 26)'}</li>
                  <li>{language === 'en' ? 'Right to rectification of inaccurate data (Section 27)' : 'Haki ya kurekebisha data isiyo sahihi (Kifungu cha 27)'}</li>
                  <li>{language === 'en' ? 'Right to erasure ("right to be forgotten") (Section 28)' : 'Haki ya kufutwa ("haki ya kusahauliwa") (Kifungu cha 28)'}</li>
                  <li>{language === 'en' ? 'Right to object to data processing (Section 30)' : 'Haki ya kupinga uchakataji wa data (Kifungu cha 30)'}</li>
                  <li>{language === 'en' ? 'Right to data portability (Section 32)' : 'Haki ya uhamishaji wa data (Kifungu cha 32)'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  {language === 'en' ? 'Right to Erasure' : 'Haki ya Kufutwa'}
                </h4>
                <p>
                  {language === 'en'
                    ? 'You may request deletion of any personal data associated with your use of bajetAI at any time by contacting privacy@bajetai.go.ke. Requests will be processed within 30 days in line with the Data Protection Act of Kenya 2019. Note that anonymized aggregate analytics cannot be individually deleted as they contain no identifying information.'
                    : 'Unaweza kuomba kufutwa kwa data yoyote ya kibinafsi inayohusiana na matumizi yako ya bajetAI wakati wowote kwa kuwasiliana na privacy@bajetai.go.ke. Maombi yatashughulikiwa ndani ya siku 30 kwa mujibu wa Sheria ya Ulinzi wa Data ya Kenya 2019. Kumbuka kwamba takwimu za jumla bila jina haziwezi kufutwa kibinafsi kwani hazina taarifa yoyote ya utambulisho.'}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'en' ? 'For the full beta data protection details, see our ' : 'Kwa maelezo kamili ya ulinzi wa data wakati wa beta, angalia '}
              <Link href="/beta" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                {language === 'en' ? 'Beta Release page' : 'Ukurasa wa Toleo la Beta'}
              </Link>
              {'.'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}