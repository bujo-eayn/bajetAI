'use client';

import { AuthProvider } from '@/lib/auth/AuthContext';
import { PublicAuthProvider } from '@/lib/auth/PublicAuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PublicAuthProvider>{children}</PublicAuthProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
