'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, MessageSquare, Shield, FlaskConical } from 'lucide-react';

export default function BetaPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('beta.pageTitle') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-12">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">
              {t('beta.pageTitle')}
            </h1>
            <Badge variant="warning" className="font-bold tracking-widest text-sm px-3 py-1 rounded-full">
              {t('beta.tag')}
            </Badge>
          </div>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'bajetAI is currently in public beta testing. This page explains what that means for you, how we handle your data, and how you can help improve the platform.'
              : 'bajetAI iko katika awamu ya majaribio ya umma (beta). Ukurasa huu unaelezea maana yake kwako, jinsi tunavyoshughulikia data yako, na jinsi unavyoweza kusaidia kuboresha jukwaa.'}
          </p>
        </div>

        {/* Beta Status Banner */}
        <div className="flex items-start gap-4 rounded-lg border border-warning/40 bg-warning/10 p-5">
          <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              {language === 'en'
                ? 'Public Beta — Features and Content May Change'
                : 'Beta ya Umma — Vipengele na Maudhui Vinaweza Kubadilika'}
            </p>
            <p className="text-sm text-muted-foreground">
              {language === 'en'
                ? 'This is a testing release intended to gather feedback and validate functionality before the full public launch. AI-generated content is provided for reference only — always consult the original official documents.'
                : 'Hii ni toleo la majaribio linalolendelee kukusanya maoni na kuthibitisha utendaji kabla ya uzinduzi kamili wa umma. Maudhui yanayozalishwa na AI ni kwa marejeo tu — daima rejelea hati rasmi za asili.'}
            </p>
          </div>
        </div>

        {/* What Beta Means */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">
              {language === 'en' ? 'What Beta Means' : 'Maana ya Beta'}
            </h2>
          </div>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              {language === 'en'
                ? 'Beta software is a pre-release version that is functionally complete but still undergoing testing. On bajetAI in beta:'
                : 'Programu ya beta ni toleo la kabla ya kutolewa ambalo kimsingi limekamilika lakini bado linapitia majaribio. Kwenye bajetAI katika beta:'}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                {language === 'en'
                  ? 'Features may be added, changed, or removed without prior notice.'
                  : 'Vipengele vinaweza kuongezwa, kubadilishwa, au kuondolewa bila taarifa ya awali.'}
              </li>
              <li>
                {language === 'en'
                  ? 'AI-generated summaries and chat responses are experimental and for reference only.'
                  : 'Muhtasari na majibu ya mazungumzo yanayozalishwa na AI ni ya majaribio na kwa marejeo tu.'}
              </li>
              <li>
                {language === 'en'
                  ? 'Some documents and participation areas may not yet be available.'
                  : 'Baadhi ya hati na maeneo ya ushiriki yanaweza bado hayapatikani.'}
              </li>
              <li>
                {language === 'en'
                  ? 'Content accuracy is subject to ongoing improvement — always verify against official sources.'
                  : 'Usahihi wa maudhui unaboreshwa mara kwa mara — daima thibitisha dhidi ya vyanzo rasmi.'}
              </li>
            </ul>
          </div>
        </section>

        {/* How to Give Feedback */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">
              {language === 'en' ? 'How to Give Feedback' : 'Jinsi ya Kutoa Maoni'}
            </h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {language === 'en'
              ? 'Your feedback is essential to improving bajetAI before the full launch. You can reach us through:'
              : 'Maoni yako ni muhimu kwa kuboresha bajetAI kabla ya uzinduzi kamili. Unaweza kuwasiliana nasi kupitia:'}
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
            <li>
              {language === 'en' ? 'Email: ' : 'Barua pepe: '}
              <a
                href="mailto:feedback@bajetai.go.ke"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                feedback@bajetai.go.ke
              </a>
            </li>
            <li>
              {language === 'en'
                ? 'The Contact page on this platform'
                : 'Ukurasa wa Wasiliana kwenye jukwaa hili'}
              {' — '}
              <Link
                href="/contact"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {language === 'en' ? 'Contact Us' : 'Wasiliana Nasi'}
              </Link>
            </li>
          </ul>
        </section>

        {/* Data Protection During Beta */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold">
              {language === 'en'
                ? 'Data Protection During Beta'
                : 'Ulinzi wa Data Wakati wa Beta'}
            </h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              {language === 'en'
                ? 'bajetAI complies with the Data Protection Act of Kenya (2019) (Cap. 411C). During the beta phase, we process limited user data to enable platform functionality and to improve the service. Here is what you need to know:'
                : 'bajetAI inazingatia Sheria ya Ulinzi wa Data ya Kenya (2019) (Sura. 411C). Wakati wa awamu ya beta, tunachakata data ndogo ya watumiaji ili kuwezesha utendaji wa jukwaa na kuboresha huduma. Hapa kuna unachohitaji kujua:'}
            </p>

            <div className="rounded-lg border bg-muted/40 p-5 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {language === 'en' ? 'What We Collect in Beta' : 'Tunachokusanya Wakati wa Beta'}
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>
                    {language === 'en'
                      ? 'Anonymous usage data (page views, feature interactions) to improve the platform.'
                      : 'Data ya matumizi bila jina (mionekano ya kurasa, mwingiliano wa vipengele) kuboresha jukwaa.'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Language preference stored locally in your browser.'
                      : 'Mapendeleo ya lugha yaliyohifadhiwa ndani ya kivinjari chako.'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Temporary chat session identifiers (stored in your browser session only, never on our servers).'
                      : 'Vitambulisho vya muda vya kipindi cha mazungumzo (vimehifadhiwa kwenye kipindi cha kivinjari chako tu, kamwe si kwenye seva zetu).'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Feedback and contact submissions if you choose to provide them voluntarily.'
                      : 'Maoni na mawasiliano ikiwa utachagua kuyatoa kwa hiari.'}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {language === 'en'
                    ? 'Your Rights Under the Data Protection Act of Kenya 2019'
                    : 'Haki Zako Chini ya Sheria ya Ulinzi wa Data ya Kenya 2019'}
                </h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                  <li>
                    {language === 'en'
                      ? 'Right of access to your personal data (Section 26)'
                      : 'Haki ya ufikiaji wa data yako ya kibinafsi (Kifungu cha 26)'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Right to rectification of inaccurate data (Section 27)'
                      : 'Haki ya kurekebisha data isiyo sahihi (Kifungu cha 27)'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Right to erasure ("right to be forgotten") (Section 28)'
                      : 'Haki ya kufutwa ("haki ya kusahauliwa") (Kifungu cha 28)'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Right to object to data processing (Section 30)'
                      : 'Haki ya kupinga uchakataji wa data (Kifungu cha 30)'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Right to data portability (Section 32)'
                      : 'Haki ya uhamishaji wa data (Kifungu cha 32)'}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {language === 'en' ? 'Beta Data Retention' : 'Uhifadhi wa Data Wakati wa Beta'}
                </h3>
                <p className="text-sm">
                  {language === 'en'
                    ? 'Data collected during the beta period may be reviewed and cleaned up at full launch. We will notify users of any material changes to data handling practices at least 30 days in advance, in accordance with the Data Protection Act of Kenya 2019.'
                    : 'Data iliyokusanywa wakati wa awamu ya beta inaweza kukaguliwa na kusafishwa wakati wa uzinduzi kamili. Tutawajulisha watumiaji kuhusu mabadiliko yoyote ya msingi katika mazoea ya ushughulikiaji wa data angalau siku 30 kabla, kwa mujibu wa Sheria ya Ulinzi wa Data ya Kenya 2019.'}
                </p>
              </div>
            </div>

            <p className="text-sm">
              {language === 'en'
                ? 'To exercise any of your data rights or to raise a data protection concern, please contact our Data Protection Officer at '
                : 'Ili kutumia haki yoyote ya data yako au kuibua wasiwasi wa ulinzi wa data, tafadhali wasiliana na Afisa wetu wa Ulinzi wa Data kwa '}
              <a
                href="mailto:privacy@bajetai.go.ke"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                privacy@bajetai.go.ke
              </a>
              {language === 'en' ? '. For more information, see our full ' : '. Kwa maelezo zaidi, angalia '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {language === 'en' ? 'Privacy Policy' : 'Sera yetu ya Faragha'}
              </Link>
              {'.'}
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
