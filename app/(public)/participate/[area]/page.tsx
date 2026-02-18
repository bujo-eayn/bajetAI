'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Breadcrumb } from '@/components/molecules/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Construction } from 'lucide-react';
import { useRouter } from 'next/navigation';

const VALID_AREAS = ['planning', 'healthcare', 'education', 'transport'] as const;
type ParticipationArea = (typeof VALID_AREAS)[number];

const areaConfig: Record<ParticipationArea, { titleKey: string; descriptionKey: string; launch: string }> = {
  planning: {
    titleKey: 'area.planning.title',
    descriptionKey: 'area.planning.description',
    launch: 'Q2 2026',
  },
  healthcare: {
    titleKey: 'area.healthcare.title',
    descriptionKey: 'area.healthcare.description',
    launch: 'Q2 2026',
  },
  education: {
    titleKey: 'area.education.title',
    descriptionKey: 'area.education.description',
    launch: 'Q3 2026',
  },
  transport: {
    titleKey: 'area.transport.title',
    descriptionKey: 'area.transport.description',
    launch: 'Q3 2026',
  },
};

export default function ComingSoonPage({ params }: { params: Promise<{ area: string }> }) {
  const resolvedParams = use(params);
  const { t, language } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const area = resolvedParams.area as ParticipationArea;
  const config = areaConfig[area];

  // If invalid area, redirect to home
  if (!VALID_AREAS.includes(area)) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/public/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, area }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
        setEmail(''); // Clear form
      } else {
        setMessage({ type: 'error', text: data.error || t('comingSoon.errorMessage') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('comingSoon.errorMessage') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: t('nav.participate'), href: '/participate' },
    { label: t(config.titleKey) },
  ];

  return (
    <PublicLayout maxWidth="md">
      <div className="space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbs} />

        {/* Coming Soon Section */}
        <div className="flex flex-col items-center justify-center space-y-6 py-12 text-center">
          {/* Icon */}
          <div className="rounded-full bg-warning/10 p-6">
            <Construction className="h-12 w-12 text-warning" aria-hidden="true" />
          </div>

          {/* Badge */}
          <Badge variant="warning" className="text-base px-4 py-1">
            {t('comingSoon.title')}
          </Badge>

          {/* Title */}
          <h1 className="text-4xl font-bold tracking-tight">{t(config.titleKey)}</h1>

          {/* Description */}
          <p className="max-w-2xl text-lg text-muted-foreground">
            {t('comingSoon.description')}
          </p>

          {/* Launch Date */}
          <p className="text-sm text-muted-foreground">
            {t('comingSoon.expectedLaunch')}: <span className="font-semibold">{config.launch}</span>
          </p>

          {/* Notification Form */}
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email">{language === 'en' ? 'Email Address' : 'Barua Pepe'}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('comingSoon.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (language === 'en' ? 'Submitting...' : 'Inawasilisha...') : t('action.notifyMe')}
            </Button>

            {/* Success/Error Message */}
            {message && (
              <div
                className={`rounded-md p-3 text-sm font-medium ${
                  message.type === 'success'
                    ? 'bg-success/20 text-success border border-success/30'
                    : 'bg-destructive/20 text-destructive border border-destructive/30'
                }`}
                role="alert"
              >
                {message.text}
              </div>
            )}
          </form>

          {/* Back Link */}
          <Button asChild variant="ghost" className="mt-8">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('comingSoon.backToAreas')}
            </Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
