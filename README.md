# Recipes in, one list out

Paste (or photograph) recipes, and get one consolidated Coles shopping list —
with your pantry staples stripped out, your favourite products remembered, a
learn-once kosher check, and a separate "can't get at Coles" reminder list.

## What works today (v1)

- **Add recipes** by text or photo. Claude (Haiku 4.5) extracts the ingredients.
- **Consolidation engine** merges everything: dedupes names, sums quantities
  (mass / volume / count folded sensibly), and drops pantry staples.
- **Kosher, learn-once**: tap a product's chip to mark it kosher / not /
  unverified. It's remembered, so you only ever check a product once.
- **Favourites**: a "bought before" product per ingredient is reused next time.
- **Can't-get-at-Coles list**: tracked separately, appended to every shop.
- Runs fully **on your own device** — data lives in your browser (localStorage).

Coles product matching is **stubbed** for now (see `src/lib/coles.ts`): each
line gets a real Coles *search* link so it's usable, and real product/price
matching drops into that one file later.

## Run it

```bash
cp .env.example .env.local      # add your ANTHROPIC_API_KEY
npm install
npm run dev                     # http://localhost:3000
```

Get an API key at https://console.anthropic.com — it's pay-as-you-go and
separate from a Claude.ai subscription. Extraction runs on Haiku 4.5, so a
recipe costs well under a cent.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add `ANTHROPIC_API_KEY` as an environment variable.
4. Deploy. Both of you can then open the same URL.

> Note: until Phase 2, data is per-browser (not shared). Deploying makes the
> app reachable from any device; sharing one list comes next.

## Phase 2 — sharing between two people

The whole app talks to `src/lib/store.ts` only. To share one list:

1. Create a Supabase project, run `supabase/schema.sql` in its SQL editor.
2. Put `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your env.
3. Swap `load()` / `save()` in `store.ts` for Supabase reads/writes keyed by
   household. Row-level security is already set up so each household only sees
   its own data.

## Coles integration paths (for later)

- **Path B (recommended, robust):** resolve each item to a Coles product +
  price + URL via a product-data source, hand over one-tap add-through links.
  Survives Coles site changes; your account stays clean.
- **Path A (experimental toggle):** drive Coles' internal trolley endpoint with
  your own session for true auto-add. Fragile and against Coles' terms — build
  it behind a flag and expect it to break on redesigns.

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
src/lib/anthropic.ts     recipe extraction
src/lib/coles.ts         Coles matcher (STUB — replace here)
src/lib/store.ts         persistence (localStorage — swap for Supabase)
src/app/api/extract      server route (keeps your API key hidden)
src/components/*          UI
```
