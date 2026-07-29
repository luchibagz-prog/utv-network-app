-- UTV MONETIZATION PACK 1
-- Run this in Supabase SQL Editor.
-- No DO $$ blocks.

create extension if not exists pgcrypto;

create table if not exists public.utv_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.utv_boosts (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  boost_level text not null,
  target_type text not null default 'post',
  target_id text,
  target_url text,
  title text,
  amount_cents integer not null default 0,
  status text not null default 'pending',
  stripe_session_id text unique,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists
utv_subscriptions_user_email_idx
on public.utv_subscriptions (lower(user_email));

create index if not exists
utv_boosts_user_email_idx
on public.utv_boosts (lower(user_email));

create index if not exists
utv_boosts_status_ends_idx
on public.utv_boosts (status, ends_at);

alter table public.utv_subscriptions
enable row level security;

alter table public.utv_boosts
enable row level security;

drop policy if exists
"Users read own UTV subscription"
on public.utv_subscriptions;

create policy
"Users read own UTV subscription"
on public.utv_subscriptions
for select
to authenticated
using (
  lower(user_email) =
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  )
);

drop policy if exists
"Users read own UTV boosts"
on public.utv_boosts;

create policy
"Users read own UTV boosts"
on public.utv_boosts
for select
to authenticated
using (
  lower(user_email) =
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  )
);

grant select
on public.utv_subscriptions
to authenticated;

grant select
on public.utv_boosts
to authenticated;
