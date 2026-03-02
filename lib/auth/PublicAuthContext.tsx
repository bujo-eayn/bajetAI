'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { PublicProfile } from '@/types';

type PublicAuthContextType = {
  user: User | null;
  publicProfile: PublicProfile | null;
  loading: boolean;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const PublicAuthContext = createContext<PublicAuthContextType | undefined>(undefined);

export function PublicAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPublicProfile = useCallback(
    async (userId: string) => {
      try {
        const { data } = await supabase
          .from('public_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        setPublicProfile(data ?? null);
      } catch {
        setPublicProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPublicProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPublicProfile(session.user.id);
      } else {
        setPublicProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchPublicProfile]);

  const sendMagicLink = async (email: string, redirectTo?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            redirectTo ||
            `${window.location.origin}/auth/callback`,
          // Pass role in metadata so handle_new_user trigger stays dormant
          data: { role: 'citizen' },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPublicProfile(null);
  };

  return (
    <PublicAuthContext.Provider
      value={{ user, publicProfile, loading, sendMagicLink, signOut }}
    >
      {children}
    </PublicAuthContext.Provider>
  );
}

export function usePublicAuth() {
  const context = useContext(PublicAuthContext);
  if (context === undefined) {
    throw new Error('usePublicAuth must be used within a PublicAuthProvider');
  }
  return context;
}
