-- ============================================================
-- Stonixra POS — REAL LOGIN / AUTH SETUP
-- Run this ONCE in Supabase Dashboard → SQL Editor.
-- (Run supabase_schema.sql too if you haven't already.)
-- ============================================================

-- 1) Profile per user: maps a Supabase Auth user to portal/role/branch.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  portal      text not null default 'branch',   -- 'hq' or 'branch'
  role        text not null default 'cashier',  -- 'owner' | 'admin' | 'cashier' | 'waiter'
  branch_id   text not null default 'subang',
  branch_name text not null default 'Subang',
  active      boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

-- 2) RLS: a user can read & update only their OWN profile.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3) Auto-create a profile row whenever a new auth user is added.
--    When you create a user in the Dashboard you can pass User Metadata
--    (raw_user_meta_data) like: portal, role, branch_id, branch_name, display_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, portal, role, branch_id, branch_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'portal',      'branch'),
    coalesce(new.raw_user_meta_data->>'role',        'cashier'),
    coalesce(new.raw_user_meta_data->>'branch_id',   'subang'),
    coalesce(new.raw_user_meta_data->>'branch_name', 'Subang')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- AFTER RUNNING THIS:
-- Create users in Dashboard → Authentication → Users → Add user.
-- Tick "Auto Confirm User". The trigger makes their profile automatically.
-- To make someone HQ owner, run an UPDATE (example below), or set the
-- metadata at creation time.
--
-- Example: promote owner@stonixra.pos to HQ owner
-- update public.profiles
--   set portal='hq', role='owner', branch_id='all', branch_name='All Branches'
--   where email='owner@stonixra.pos';
--
-- Example: a Nilai branch cashier
-- update public.profiles
--   set portal='branch', role='cashier', branch_id='nilai', branch_name='Nilai'
--   where email='nilai@stonixra.pos';
-- ============================================================
