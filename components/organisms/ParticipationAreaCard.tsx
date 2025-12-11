'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';

export interface ParticipationAreaCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'coming-soon';
  href: string;
  statusLabel: string;
  actionLabel: string;
}

export function ParticipationAreaCard({
  title,
  description,
  icon: Icon,
  status,
  href,
  statusLabel,
  actionLabel,
}: ParticipationAreaCardProps) {
  const { language } = useLanguage();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleComingSoonClick = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <Card className="group relative flex flex-col gap-4 p-6 transition-all hover:shadow-lg hover:scale-[1.02]">
      {/* Icon & Status */}
      <div className="flex items-start justify-between">
        <div className="rounded-full bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <Badge variant={status === 'active' ? 'success' : 'warning'}>
          {statusLabel}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
      </div>

      {/* Coming Soon Message */}
      {showComingSoon && status === 'coming-soon' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm rounded-lg p-4 text-center">
          <p className="text-sm font-medium">
            {language === 'en'
              ? 'This area is coming soon! Check back later for updates.'
              : 'Eneo hili linakuja hivi karibuni! Rudi baadaye kwa masasisho.'}
          </p>
        </div>
      )}

      {/* Action */}
      {status === 'active' ? (
        <Button asChild variant="default" className="w-full">
          <Link href={href}>{actionLabel}</Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleComingSoonClick}
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
