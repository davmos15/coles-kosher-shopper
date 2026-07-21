import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client, built from the same public env vars. Auth in
// this app is handled entirely in the browser (magic link + client session),
// and row-level security is enforced in the database, so server code that needs
// to read/write on behalf of a user passes that user's access token here.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both public Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Create a per-request server client, or `null` when Supabase isn't configured.
 * Pass a user's access token to act as that user under RLS; omit it for an
 * anonymous client.
 */
export function getServerClient(accessToken?: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
