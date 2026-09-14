create table if not exists public.utv_creator_payout_accounts (
  user_email text primary key,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  utv_creator_payout_accounts_stripe_idx
  on public.utv_creator_payout_accounts (stripe_account_id);

alter table public.utv_creator_payout_accounts
  enable row level security;

drop policy if exists
  "Creators can read their own payout account"
  on public.utv_creator_payout_accounts;

create policy
  "Creators can read their own payout account"
  on public.utv_creator_payout_accounts
  for select
  to authenticated
  using (
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    ) = lower(user_email)
  );
