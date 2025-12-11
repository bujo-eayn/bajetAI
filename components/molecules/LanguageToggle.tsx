'use client';

import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'sw' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      aria-label={language === 'en' ? 'Switch to Swahili' : 'Badilisha kwa Kiingereza'}
      className="gap-2 font-medium"
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span className="font-semibold">{language.toUpperCase()}</span>
      <span className="text-muted-foreground">|</span>
      <span className="text-muted-foreground">{language === 'en' ? 'SW' : 'EN'}</span>
    </Button>
  );
}
