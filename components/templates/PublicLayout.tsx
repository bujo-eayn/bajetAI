import { ReactNode } from 'react';
import { PublicHeader } from '@/components/organisms/PublicHeader';
import { PublicFooter } from '@/components/organisms/PublicFooter';
import { cn } from '@/lib/utils';

export interface PublicLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function PublicLayout({ children, maxWidth = 'md', className }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">
        <div className={cn('container mx-auto px-4 py-8', maxWidthMap[maxWidth], className)}>
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
