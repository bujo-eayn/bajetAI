import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in client components
 * This client automatically handles auth state and cookies
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
