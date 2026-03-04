'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePublicAuth } from '@/lib/auth/PublicAuthContext';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';

interface PublicAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current page URL — magic link will redirect back here after sign-in */
  redirectTo?: string;
  /** Contextual reason shown to the user, e.g. "to post a comment" */
  reason?: string;
}

export function PublicAuthModal({
  open,
  onOpenChange,
  redirectTo,
  reason,
}: PublicAuthModalProps) {
  const { sendMagicLink } = usePublicAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const callbackUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            redirectTo || window.location.pathname
          )}`
        : '/auth/callback';

    const { error: sendError } = await sendMagicLink(email, callbackUrl);

    if (sendError) {
      setError('Could not send the link. Please check your email and try again.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state after the dialog close animation finishes
      setTimeout(() => {
        setSent(false);
        setEmail('');
        setError('');
      }, 300);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                Join bajetAI
              </DialogTitle>
              <DialogDescription>
                Enter your email{reason ? ` ${reason}` : ''}. We&apos;ll send a
                magic link — no password needed.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-modal-email">Email address</Label>
                <Input
                  id="auth-modal-email"
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
                disabled={loading || !email}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send magic link
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You&apos;ll be given an anonymous username automatically.
                Already have an account? Just enter the same email.
              </p>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle
                  className="h-5 w-5 text-success"
                  aria-hidden="true"
                />
                Check your inbox
              </DialogTitle>
              <DialogDescription>
                We sent a magic link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                Click the link to sign in — it expires in 1 hour.
              </DialogDescription>
            </DialogHeader>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
