"use client";

import { useState, type ReactNode } from "react";
import { useSupabase } from "@/lib/supabase/provider";

// Gates the app behind sign-in when Supabase is configured. In local-only mode
// (no env vars) it renders children straight through, so nothing about the
// offline experience changes.

export function AuthGate({ children }: { children: ReactNode }) {
  const sb = useSupabase();

  if (!sb.configured) return <>{children}</>;

  if (sb.authLoading) return <Splash>Loading…</Splash>;
  if (!sb.user) return <SignIn />;
  if (sb.householdLoading) return <Splash>Finding your shop…</Splash>;
  if (!sb.household) return <HouseholdSetup />;

  return <>{children}</>;
}

function Splash({ children }: { children: ReactNode }) {
  return <main className="min-h-screen grid place-items-center text-muted">{children}</main>;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm bg-card border border-line rounded-2xl p-6 space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="display text-lg text-grocer">▪</span>
          <h1 className="display text-lg">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function SignIn() {
  const { signInWithEmail } = useSupabase();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setError(error);
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <Shell title="Check your email">
        <p className="text-sm text-muted">
          We sent a magic link to <span className="text-ink">{email}</span>. Open it on
          this device to sign in — you can close this tab.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Sign in to share your list">
      <p className="text-sm text-muted">
        Enter your email and we&apos;ll send a one-tap magic link — no password.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-grocer"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg bg-grocer text-white py-2 text-sm font-medium disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </Shell>
  );
}

function HouseholdSetup() {
  const { createHousehold, joinHousehold, signOut, user } = useSupabase();
  const defaultName = user?.email?.split("@")[0] ?? "";
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [displayName, setDisplayName] = useState(defaultName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    if (error) setError(error);
    setBusy(false);
  }

  if (mode === "choose") {
    return (
      <Shell title="One shared shop">
        <p className="text-sm text-muted">
          Start a shop and invite the other person, or join theirs with an invite code.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => setMode("create")}
            className="w-full rounded-lg bg-grocer text-white py-2 text-sm font-medium"
          >
            Start a new shop
          </button>
          <button
            onClick={() => setMode("join")}
            className="w-full rounded-lg border border-line py-2 text-sm font-medium hover:border-grocer"
          >
            Join with an invite code
          </button>
        </div>
        <SignOutLink onClick={signOut} />
      </Shell>
    );
  }

  return (
    <Shell title={mode === "create" ? "Start a new shop" : "Join a shop"}>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Your name (so the other person sees who added what)</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Sam"
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-grocer"
        />
      </label>

      {mode === "join" && (
        <label className="block space-y-1">
          <span className="text-xs text-muted">Invite code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="paste the code you were sent"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm font-mono outline-none focus:border-grocer"
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        disabled={busy}
        onClick={() =>
          run(() =>
            mode === "create"
              ? createHousehold(displayName)
              : joinHousehold(code, displayName)
          )
        }
        className="w-full rounded-lg bg-grocer text-white py-2 text-sm font-medium disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "create" ? "Create shop" : "Join shop"}
      </button>

      <button
        onClick={() => {
          setMode("choose");
          setError(null);
        }}
        className="w-full text-xs text-muted hover:text-ink"
      >
        ← Back
      </button>
    </Shell>
  );
}

function SignOutLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-xs text-muted hover:text-ink">
      Sign out
    </button>
  );
}
