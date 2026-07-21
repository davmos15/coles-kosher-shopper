"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getBrowserClient, isSupabaseConfigured } from "./client";

export interface Household {
  id: string;
  name: string;
}

interface SupabaseContextValue {
  /** Whether the public Supabase env vars are present. */
  configured: boolean;
  /** Browser client, or null in local-only mode. */
  client: SupabaseClient | null;
  user: User | null;
  household: Household | null;
  /** Still resolving the auth session. */
  authLoading: boolean;
  /** Signed in, still resolving household membership. */
  householdLoading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createHousehold: (displayName: string) => Promise<{ error: string | null }>;
  joinHousehold: (
    code: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [householdLoading, setHouseholdLoading] = useState(false);

  // Track the auth session.
  useEffect(() => {
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  // Resolve which household the signed-in user belongs to.
  useEffect(() => {
    if (!client || !user) {
      setHousehold(null);
      return;
    }
    let active = true;
    setHouseholdLoading(true);
    (async () => {
      const { data: member } = await client
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (!member) {
        setHousehold(null);
        setHouseholdLoading(false);
        return;
      }
      const { data: h } = await client
        .from("households")
        .select("id, name")
        .eq("id", member.household_id)
        .maybeSingle();
      if (!active) return;
      setHousehold(h ? { id: h.id, name: h.name } : null);
      setHouseholdLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [client, user]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!client) return { error: "Supabase is not configured." };
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      return { error: error?.message ?? null };
    },
    [client]
  );

  const signOut = useCallback(async () => {
    if (!client) return;
    await client.auth.signOut();
    setHousehold(null);
  }, [client]);

  const createHousehold = useCallback(
    async (displayName: string) => {
      if (!client || !user) return { error: "Not signed in." };
      const { data: h, error } = await client.rpc("create_household", {
        p_name: "Our shop",
        p_display_name: displayName.trim(),
      });
      if (error || !h) return { error: error?.message ?? "Could not create household." };
      setHousehold({ id: h.id, name: h.name });
      return { error: null };
    },
    [client, user]
  );

  const joinHousehold = useCallback(
    async (code: string, displayName: string) => {
      if (!client || !user) return { error: "Not signed in." };
      const id = code.trim();
      if (!UUID_RE.test(id)) return { error: "That doesn't look like a valid invite code." };
      const { data: h, error } = await client.rpc("join_household", {
        p_code: id,
        p_display_name: displayName.trim(),
      });
      if (error || !h) {
        const msg = error?.message ?? "";
        return {
          error: /No household found/i.test(msg)
            ? "No household found for that invite code."
            : msg || "Could not join that household.",
        };
      }
      setHousehold({ id: h.id, name: h.name });
      return { error: null };
    },
    [client, user]
  );

  const value = useMemo<SupabaseContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      client,
      user,
      household,
      authLoading,
      householdLoading,
      signInWithEmail,
      signOut,
      createHousehold,
      joinHousehold,
    }),
    [
      client,
      user,
      household,
      authLoading,
      householdLoading,
      signInWithEmail,
      signOut,
      createHousehold,
      joinHousehold,
    ]
  );

  return (
    <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>
  );
}

export function useSupabase(): SupabaseContextValue {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error("useSupabase must be used within <SupabaseProvider>");
  return ctx;
}
