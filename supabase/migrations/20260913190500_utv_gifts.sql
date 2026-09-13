create table if not exists public.utv_gifts (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null,
  recipient_email text not null,
  gift_name text not null,
  amount_cents integer not null check (amount_cents > 0),
  stripe_session_id text not null unique,
  stripe_payment_intent_id text,
  status text not null default 'paid',
  payout_status text not null default 'pending_setup',
  created_at timestamptz not null default now()
);

create index if not exists utv_gifts_sender_idx
  on public.utv_gifts (lower(sender_email), created_at desc);

create index if not exists utv_gifts_recipient_idx
  on public.utv_gifts (lower(recipient_email), created_at desc);

alter table public.utv_gifts enable row level security;

drop policy if exists
  "Users can read their own UTV gifts"
  on public.utv_gifts;

create policy
  "Users can read their own UTV gifts"
  on public.utv_gifts
  for select
  to authenticated
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) =
      lower(sender_email)
    or
    lower(coalesce(auth.jwt() ->> 'email', '')) =
      lower(recipient_email)
  );
