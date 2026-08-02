create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_email_idx
  on public.push_subscriptions (lower(user_email));

alter table public.push_subscriptions enable row level security;

-- Browser clients never read subscription secrets directly.
-- The server-side API uses SUPABASE_SERVICE_ROLE_KEY.
revoke all on public.push_subscriptions from anon, authenticated;

-- Standardize the existing notification read column when possible.
alter table if exists public.notifications
  add column if not exists is_read boolean not null default false;

update public.notifications
set is_read = coalesce(is_read, false)
where is_read is null;
