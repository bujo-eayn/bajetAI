'use client';

import { HeroSection } from '@/components/organisms/HeroSection';
import { ParticipationAreaCard } from '@/components/organisms/ParticipationAreaCard';
import { PublicHeader } from '@/components/organisms/PublicHeader';
import { PublicFooter } from '@/components/organisms/PublicFooter';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, Building2, Heart, GraduationCap, Bus } from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();

  const participationAreas = [
    {
      id: 'budgeting',
      title: t('area.budgeting.title'),
      description: t('area.budgeting.description'),
      icon: FileText,
      status: 'active' as const,
      href: '/participate?category=budgeting',
      statusLabel: t('status.active'),
      actionLabel: t('action.viewDocs'),
    },
    {
      id: 'planning',
      title: t('area.planning.title'),
      description: t('area.planning.description'),
      icon: Building2,
      status: 'coming-soon' as const,
      href: '/participate?category=planning',
      statusLabel: t('status.comingSoon'),
      actionLabel: t('action.notifyMe'),
    },
    {
      id: 'healthcare',
      title: t('area.healthcare.title'),
      description: t('area.healthcare.description'),
      icon: Heart,
      status: 'coming-soon' as const,
      href: '/participate?category=healthcare',
      statusLabel: t('status.comingSoon'),
      actionLabel: t('action.notifyMe'),
    },
    {
      id: 'education',
      title: t('area.education.title'),
      description: t('area.education.description'),
      icon: GraduationCap,
      status: 'coming-soon' as const,
      href: '/participate?category=education',
      statusLabel: t('status.comingSoon'),
      actionLabel: t('action.notifyMe'),
    },
    {
      id: 'transport',
      title: t('area.transport.title'),
      description: t('area.transport.description'),
      icon: Bus,
      status: 'coming-soon' as const,
      href: '/participate?category=transport',
      statusLabel: t('status.comingSoon'),
      actionLabel: t('action.notifyMe'),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section - Full Width */}
        <HeroSection />

        {/* Participation Areas Grid - Contained */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
              {t('home.areas.title')}
            </h2>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {participationAreas.map((area) => (
                <ParticipationAreaCard key={area.id} {...area} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
