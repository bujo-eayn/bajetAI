'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, Keyboard, Languages, Contrast } from 'lucide-react';

export default function AccessibilityPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('footer.accessibility') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('footer.accessibility')}</h1>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'Our commitment to making government information accessible to everyone.'
              : 'Dhamira yetu ya kufanya taarifa za serikali zipatikane kwa kila mtu.'}
          </p>
        </div>

        {/* Accessibility Features */}
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
                ? 'bajetAI provides content in both English and Swahili, with AI-powered translations to ensure all citizens can access government information in their preferred language.'
                : 'bajetAI inatoa maudhui kwa Kiingereza na Kiswahili, pamoja na tafsiri zinazotumia AI kuhakikisha raia wote wanaweza kufikia taarifa za serikali katika lugha wanayopendelea.'}
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
                ? 'Our platform is designed to work seamlessly with screen readers and assistive technologies, with proper ARIA labels and semantic HTML.'
                : 'Jukwaa letu limeundwa kufanya kazi vizuri na wasomaji wa skrini na teknolojia za kusaidia, pamoja na lebo sahihi za ARIA na HTML ya kimantiki.'}
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
                ? 'All interactive elements can be accessed and operated using keyboard navigation, ensuring users who cannot use a mouse can navigate effectively.'
                : 'Vipengele vyote vya mwingiliano vinaweza kufikiwa na kuendeshwa kwa kutumia urambazaji wa kibodi, kuhakikisha watumiaji ambao hawawezi kutumia kipanya wanaweza kusafiri kwa ufanisi.'}
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
                ? 'Our interface uses high contrast colors and clear typography to ensure readability for users with visual impairments.'
                : 'Kiolesura chetu kinatumia rangi za utofautishaji wa juu na maandishi wazi kuhakikisha kusoma kwa watumiaji wenye matatizo ya kuona.'}
            </p>
          </section>

          <section className="space-y-4 mt-12">
            <h3 className="text-xl font-semibold">
              {language === 'en' ? 'Feedback' : 'Maoni'}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {language === 'en'
                ? 'We are continuously working to improve accessibility. If you encounter any barriers or have suggestions, please contact us at accessibility@bajetai.go.ke'
                : 'Tunaendelea kuboresha ufikiaji. Ikiwa unakutana na vizuizi vyovyote au una mapendekezo, tafadhali wasiliana nasi kwa accessibility@bajetai.go.ke'}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
