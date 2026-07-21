-- Phase 2: shared data so two people see one list.
-- Run this in the Supabase SQL editor once you've created a project.
-- The app currently uses localStorage; switch src/lib/store.ts over to these
-- tables when you're ready to share.
--
-- Model note: a "household" groups the two of you. Each person signs in
-- (Supabase Auth) and belongs to one household; all data hangs off the
-- household so you both read/write the same shop.

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our shop',
  created_at timestamptz default now()
);

create table if not exists household_members (
  household_id uuid references households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  primary key (household_id, user_id)
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  title text not null,
  added_by text not null,
  ingredients jsonb not null,           -- Ingredient[]
  created_at timestamptz default now()
);

create table if not exists pantry_staples (
  household_id uuid references households(id) on delete cascade,
  name text not null,
  primary key (household_id, name)
);

create table if not exists favourites (
  household_id uuid references households(id) on delete cascade,
  ingredient_key text not null,         -- normalised ingredient name
  product jsonb not null,               -- Product
  primary key (household_id, ingredient_key)
);

create table if not exists kosher_memory (
  household_id uuid references households(id) on delete cascade,
  product_key text not null,
  status text not null check (status in ('verified','not','unverified')),
  primary key (household_id, product_key)
);

create table if not exists unavailable_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  note text default ''
);

-- Row Level Security: members only see their household's rows.
alter table recipes enable row level security;
alter table pantry_staples enable row level security;
alter table favourites enable row level security;
alter table kosher_memory enable row level security;
alter table unavailable_items enable row level security;

create or replace function is_member(h uuid) returns boolean language sql stable as $$
  select exists (
    select 1 from household_members m
    where m.household_id = h and m.user_id = auth.uid()
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['recipes','pantry_staples','favourites','kosher_memory','unavailable_items']
  loop
    execute format('drop policy if exists member_all on %I;', t);
    execute format('create policy member_all on %I for all using (is_member(household_id)) with check (is_member(household_id));', t);
  end loop;
end $$;
