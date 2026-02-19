'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateUniqueUsername } from '@/lib/utils/usernameGenerator';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      // Supabase client SDK auto-exchanges hash tokens on mount.
      // We wait for getSession() to reflect the active session.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setStatus('error');
        return;
      }

      const user = session.user;

      // Check if a public_profile already exists for this user
      const { data: existingProfile } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        // First sign-in: create a public_profile with a unique anonymous username
        const username = await generateUniqueUsername(async (u) => {
          const { data } = await supabase
            .from('public_profiles')
            .select('id')
            .eq('username', u)
            .single();
          return !!data;
        });

        const { error: insertError } = await supabase
          .from('public_profiles')
          .insert({
            id: user.id,
            username,
            email: user.email!,
            role: 'citizen',
          });

        if (insertError) {
          console.error('Failed to create public profile:', insertError);
          setStatus('error');
          return;
        }
      }

      // Redirect back to the page the user came from, defaulting to /participate
      const next = searchParams.get('next') || '/participate';
      router.replace(next);
    }

    handleCallback();
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <PublicLayout>
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Sign-in failed</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            There was a problem signing you in. The link may have expired. Please try again.
          </p>
          <Button onClick={() => router.push('/join')}>Try again</Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Signing you in&hellip;</p>
        </div>
      </div>
    </PublicLayout>
  );
}
