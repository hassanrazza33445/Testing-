-- ============================================================
-- Stonixra POS — Durable SALES table (fixes multi-branch HQ sync)
-- Run ONCE in Supabase Dashboard -> SQL Editor.
-- Each completed sale is one row, so branches never overwrite each other
-- and HQ can see every branch's sales.
-- ============================================================

create table if not exists public.sales (
  id          bigint generated always as identity primary key,
  no          text,
  branch_id   text,
  branch_name text,
  sale_date   text,            -- e.g. 2026-06-11 (local date key)
  amount      numeric default 0,
  method      text,
  order_type  text,
  items       jsonb default '[]',
  created_at  timestamptz default now()
);

alter table public.sales enable row level security;

-- Open access for now (same as pos_data). Tighten later if needed.
drop policy if exists sales_all on public.sales;
create policy sales_all on public.sales
  for all using (true) with check (true);

create index if not exists sales_date_idx on public.sales (sale_date);
create index if not exists sales_branch_idx on public.sales (branch_id);
