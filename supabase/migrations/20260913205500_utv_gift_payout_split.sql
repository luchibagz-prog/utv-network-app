alter table public.utv_gifts
  add column if not exists creator_share_cents integer,
  add column if not exists platform_fee_cents integer,
  add column if not exists stripe_transfer_id text,
  add column if not exists transfer_error text,
  add column if not exists transferred_at timestamptz;

update public.utv_gifts
set
  creator_share_cents =
    coalesce(
      creator_share_cents,
      floor(amount_cents * 0.75)::integer
    ),
  platform_fee_cents =
    coalesce(
      platform_fee_cents,
      amount_cents -
      floor(amount_cents * 0.75)::integer
    )
where
  creator_share_cents is null
  or platform_fee_cents is null;

create unique index if not exists
  utv_gifts_stripe_transfer_idx
  on public.utv_gifts (stripe_transfer_id)
  where stripe_transfer_id is not null;

create index if not exists
  utv_gifts_payout_queue_idx
  on public.utv_gifts (
    lower(recipient_email),
    payout_status,
    created_at
  );
