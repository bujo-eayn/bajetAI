'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ placeholder, onSearch, defaultValue = '', className }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative w-full flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder={placeholder || t('search.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Optional: trigger search on input change for real-time search
              // onSearch(e.target.value);
            }}
            className="pl-10"
            aria-label={t('search.label')}
          />
        </div>
        <Button type="submit" size="default" className="md:hidden gap-2 shrink-0">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only md:not-sr-only">{t('search.button')}</span>
        </Button>
      </div>
    </form>
  );
}
