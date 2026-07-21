# Recipes in, one list out

Paste (or photograph) recipes, and get one consolidated Coles shopping list —
with your pantry staples stripped out, your favourite products remembered, a
learn-once kosher check, and a separate "can't get at Coles" reminder list.

## What works today (v1)

- **Add recipes** by text or photo. Claude (Haiku 4.5) or Gemini (free tier)
  extracts the ingredients — your choice.
- **Consolidation engine** merges everything: dedupes names, sums quantities
  (mass / volume / count folded sensibly), and drops pantry staples.
- **Kosher, learn-once**: tap a product's chip to mark it kosher / not /
  unverified. It's remembered, so you only ever check a product once.
- **Favourites**: a "bought before" product per ingredient is reused next time.
- **Can't-get-at-Coles list**: tracked separately, appended to every shop.
- Runs fully **on your own device** — data lives in your browser (localStorage).

Coles product data goes through a **connector** (see `src/lib/coles.ts`): by
default each line gets a real Coles *search* link, with opt-in live product
search and per-line product pinning on top (see "Coles connector & search").

## Run it

```bash
cp .env.example .env.local      # add ANTHROPIC_API_KEY and/or GEMINI_API_KEY
npm install
npm run dev                     # http://localhost:3000
```

### Recipe extraction — Claude (paid) or Gemini (free)

Set at least one:

- **`ANTHROPIC_API_KEY`** — https://console.anthropic.com. Pay-as-you-go,
  separate from a Claude.ai subscription. Runs on Haiku 4.5 (well under a cent
  per recipe).
- **`GEMINI_API_KEY`** — https://aistudio.google.com/apikey. Has a **free
  tier**. Runs on `gemini-2.0-flash`.

If both keys are set, Gemini is used (cheapest) unless you pin a choice with
`EXTRACTION_PROVIDER=anthropic` (or `gemini`). Override the model with
`ANTHROPIC_MODEL` / `GEMINI_MODEL`. The app shows which model read each recipe,
so you can compare free vs paid on the same input. The key stays server-side —
extraction runs in `src/app/api/extract`.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add `ANTHROPIC_API_KEY` as an environment variable.
4. Deploy. Both of you can then open the same URL.

> Note: until Phase 2, data is per-browser (not shared). Deploying makes the
> app reachable from any device; sharing one list comes next.

## Phase 2 — sharing between two people (built)

One list, shared live between two devices, backed by Supabase. It's opt-in:
**leave the Supabase env vars blank and the app runs exactly as before**
(local-only, per-browser). Set them and the app gates behind sign-in and shares
one household's data.

How it works:

- `src/lib/supabase/client.ts` / `server.ts` build the clients from the public
  env vars.
- Email **magic-link** sign-in (Supabase Auth) gates the app.
- On first sign-in you **start a new shop** or **join** an existing one with an
  invite code (the household id — copy it from the header, send it to the other
  person). Membership is stored in `household_members`.
- `src/lib/store.ts` keeps the same `AppData` shape but now reads/writes the
  Supabase tables keyed by household (diff-based writes), with **realtime** so
  both devices update live. `useAppData.ts` and the engine are unchanged in
  shape; the components didn't change at all.
- Row-level security means each household only ever sees its own rows.

### Turning it on

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (creates the tables + RLS and
   enables realtime — safe to re-run).
3. In **Authentication → Providers**, enable **Email** (magic link is on by
   default). In **Authentication → URL Configuration**, set the **Site URL** and
   add your deploy URL (and `http://localhost:3000`) to the redirect allow-list.
4. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your env
   (both are safe to expose to the browser). On Vercel, add them alongside
   `ANTHROPIC_API_KEY`.
5. Both people sign in; one starts the shop and shares the invite code, the
   other joins. Done — you're on one list.

## Coles connector & search

Everything Coles goes through a small connector interface in `src/lib/coles.ts`
(`ColesConnector`), so the data source is a one-file swap. Two connectors ship:

- **`search-link`** (default): every item links to a live Coles search. Zero
  setup, works everywhere.
- **`coles-live`** (opt-in, `COLES_PROVIDER=live`): real product search against
  Coles' own internal endpoint (the same one coles.com.au calls), served from
  `/api/coles/search` so the request stays server-side. It resolves Coles'
  rotating build id automatically.

  ⚠️ **Experimental.** It's unofficial and fragile: Coles' bot protection
  commonly blocks datacenter IPs, so it tends to work from a home connection but
  fail when deployed to a cloud host like Vercel. Every failure degrades to the
  search link. It's **search-only** — Coles exposes no cart API, so nothing can
  silently add to your trolley.

On each list line, **Match on Coles** opens a search box: pick a result to pin
the real product (name, size, price, link) to that line. Pins are saved as the
"bought before" **favourite**, so prices roll into the estimated total and stick
next time. You can also **enter a product by hand** — handy when live search is
blocked: search on Coles yourself, paste the details, done.

For the whole shop: **Copy list** copies everything to the clipboard, **Open
Coles** opens their site, and you **tick items off** as they go in the trolley.

## Kosher data — how it's sourced

There's no clean API from Kosher Australia or the KA. Rather than ingest an
unreliable third-party list, the app **remembers what you verify**: check a
product once (against its on-pack symbol or the KA app), and it's stored. New
products are flagged "unverified" instead of guessed.

## Layout

```
src/lib/consolidate.ts   the engine (pure, testable)
src/lib/units.ts         quantity parsing + summing
src/lib/normalise.ts     ingredient grouping keys
src/lib/extract/*        recipe extraction (Claude or Gemini, provider-switchable)
src/lib/coles.ts         Coles matcher (STUB — replace here)
src/lib/store.ts         persistence (localStorage OR Supabase, keyed by household)
src/lib/supabase/*       Supabase clients, auth + household provider
src/app/api/extract      server route (keeps your API key hidden)
src/components/*          UI
```
