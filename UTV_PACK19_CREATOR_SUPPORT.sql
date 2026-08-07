-- UTV PACK 19 — CREATOR SUPPORT FOUNDATION
-- Run this once in Supabase SQL Editor.
-- Real revenue must only be inserted/marked paid by a trusted payment webhook.

create extension if not exists pgcrypto;

create table if not exists public.creator_support_goals (
  id uuid primary key default gen_random_uuid(),
  creator_email text not null,
  title text not null default 'Creator Goal',
  description text,
  target_amount numeric(12,2) not null default 100,
  current_amount numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_support_events (
  id uuid primary key default gen_random_uuid(),
  creator_email text not null,
  supporter_email text,
  support_type text not null check (support_type in ('tip','gift','supporter','ticket')),
  gift_type text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'usd',
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  payment_provider text,
  payment_reference text unique,
  source text,
  goal_id uuid references public.creator_support_goals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists creator_support_goals_creator_idx
  on public.creator_support_goals (creator_email, active);

create index if not exists creator_support_events_creator_idx
  on public.creator_support_events (creator_email, payment_status, created_at desc);

alter table public.creator_support_goals enable row level security;
alter table public.creator_support_events enable row level security;

drop policy if exists "Public can view active creator goals"
  on public.creator_support_goals;

create policy "Public can view active creator goals"
  on public.creator_support_goals
  for select
  using (active = true);

drop policy if exists "Creators manage their own support goals"
  on public.creator_support_goals;

create policy "Creators manage their own support goals"
  on public.creator_support_goals
  for all
  using (lower(creator_email) = lower(coalesce(auth.jwt()->>'email','')))
  with check (lower(creator_email) = lower(coalesce(auth.jwt()->>'email','')));

drop policy if exists "Creators view their paid support events"
  on public.creator_support_events;

create policy "Creators view their paid support events"
  on public.creator_support_events
  for select
  using (
    payment_status = 'paid'
    and lower(creator_email) = lower(coalesce(auth.jwt()->>'email',''))
  );

-- Do not add a client INSERT policy for creator_support_events.
-- Your Stripe/payment webhook should insert or update these rows using a server secret.
