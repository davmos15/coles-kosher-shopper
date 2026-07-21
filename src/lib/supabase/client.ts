"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client. Built from the public env vars so it can run in the
// browser. When the vars are absent the app runs local-only (localStorage), so
// this module treats "not configured" as a first-class, non-error state.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both public Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * The singleton browser client, or `null` when Supabase isn't configured.
 * Sessions persist in localStorage and magic-link tokens in the return URL are
 * detected automatically, so no auth callback route is needed.
 */
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;
  cached = createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}
