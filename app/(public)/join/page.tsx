'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicLayout } from '@/components/templates/PublicLayout';
import { usePublicAuth } from '@/lib/auth/PublicAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, CheckCircle, Loader2, User } from 'lucide-react';

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, publicProfile, loading, sendMagicLink } = usePublicAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const next = searchParams.get('next') || '/participate';

  // If already signed in as a citizen, redirect immediately
  useEffect(() => {
    if (!loading && user && publicProfile) {
      router.replace(next);
    }
  }, [loading, user, publicProfile, router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: sendError } = await sendMagicLink(email, callbackUrl);

    if (sendError) {
      setError('Could not send the link. Please check your email and try again.');
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[500px] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {!sent ? (
          <>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Join bajetAI</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to receive a magic link. No password required.
                You&apos;ll be assigned a random anonymous username automatically.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting || !email}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send magic link
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Already have an account? Just enter the same email — we&apos;ll send you a new link.
            </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Click it to sign in — the link expires in 1 hour.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Use a different email
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <JoinPageInner />
      </Suspense>
    </PublicLayout>
  );
}
