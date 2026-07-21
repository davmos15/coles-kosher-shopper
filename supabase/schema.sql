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

create table if not exists manual_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name text not null,
  quantity numeric,                     -- null = unspecified ("as needed")
  unit text default '',
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
alter table manual_items enable row level security;
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
  foreach t in array array['recipes','manual_items','pantry_staples','favourites','kosher_memory','unavailable_items']
  loop
    execute format('drop policy if exists member_all on %I;', t);
    execute format('create policy member_all on %I for all using (is_member(household_id)) with check (is_member(household_id));', t);
  end loop;
end $$;

-- Households + membership are also protected by RLS. Members can read their own
-- household and their own membership row; nobody writes these tables directly.
alter table households enable row level security;
alter table household_members enable row level security;

drop policy if exists households_select on households;
create policy households_select on households
  for select to authenticated using (is_member(id));

drop policy if exists members_select on household_members;
create policy members_select on household_members
  for select to authenticated using (user_id = auth.uid());

-- Creating/joining a household needs to write both tables atomically and read
-- the row back before you're a member — so it goes through SECURITY DEFINER
-- functions (which run as the owner, bypassing RLS) rather than direct inserts.
create or replace function create_household(p_name text, p_display_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into households (name)
    values (coalesce(nullif(p_name, ''), 'Our shop'))
    returning * into h;
  insert into household_members (household_id, user_id, display_name)
    values (h.id, auth.uid(), nullif(p_display_name, ''));
  return h;
end;
$$;

create or replace function join_household(p_code uuid, p_display_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into h from households where id = p_code;
  if not found then raise exception 'No household found for that invite code'; end if;
  insert into household_members (household_id, user_id, display_name)
    values (p_code, auth.uid(), nullif(p_display_name, ''))
    on conflict (household_id, user_id) do nothing;
  return h;
end;
$$;

grant execute on function create_household(text, text) to authenticated;
grant execute on function join_household(uuid, text) to authenticated;

-- Realtime: stream row changes to a household's members so both devices update
-- live (see src/lib/store.ts). Realtime still enforces the RLS policies above.
-- Guarded so re-running this file is safe.
do $$
declare t text;
begin
  foreach t in array array['recipes','manual_items','pantry_staples','favourites','kosher_memory','unavailable_items']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
