'use client';

import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Mail, MessageSquare, Github } from 'lucide-react';

export default function ContactPage() {
  const { t, language } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.contact') },
  ];

  return (
    <PublicLayout>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('nav.contact')}</h1>
          <p className="text-xl text-muted-foreground">
            {language === 'en'
              ? 'Get in touch with us for questions, feedback, or support.'
              : 'Wasiliana nasi kwa maswali, maoni, au usaidizi.'}
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {/* Email */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">
                {language === 'en' ? 'Email' : 'Barua Pepe'}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {language === 'en'
                ? 'Send us an email for general inquiries'
                : 'Tutumie barua pepe kwa maswali ya jumla'}
            </p>
            <a
              href="mailto:info@bajetai.go.ke"
              className="text-primary hover:underline inline-block"
            >
              info@bajetai.go.ke
            </a>
          </Card>

          {/* Feedback */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">
                {language === 'en' ? 'Feedback' : 'Maoni'}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {language === 'en'
                ? 'Share your thoughts and suggestions'
                : 'Shiriki mawazo na mapendekezo yako'}
            </p>
            <a
              href="mailto:feedback@bajetai.go.ke"
              className="text-primary hover:underline inline-block"
            >
              feedback@bajetai.go.ke
            </a>
          </Card>

          {/* Support */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Github className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold">
                {language === 'en' ? 'Technical Support' : 'Msaada wa Kiufundi'}
              </h2>
            </div>
            <p className="text-muted-foreground">
              {language === 'en'
                ? 'Report technical issues or bugs'
                : 'Ripoti matatizo ya kiufundi au hitilafu'}
            </p>
            <a
              href="mailto:support@bajetai.go.ke"
              className="text-primary hover:underline inline-block"
            >
              support@bajetai.go.ke
            </a>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
