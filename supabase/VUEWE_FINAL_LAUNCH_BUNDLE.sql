-- VUEWE FINAL LAUNCH BUNDLE — SOCIAL / REACTIONS / RESTRICT / TAP / FILTERS
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- RESTRICT
-- ---------------------------------------------------------
create table if not exists public.profile_restrictions (
  owner_email text not null,
  restricted_email text not null,
  created_at timestamptz not null default now(),
  primary key (owner_email, restricted_email),
  check (lower(owner_email) <> lower(restricted_email))
);

create index if not exists profile_restrictions_owner_idx
  on public.profile_restrictions (lower(owner_email));

create index if not exists profile_restrictions_target_idx
  on public.profile_restrictions (lower(restricted_email));

alter table public.profile_restrictions enable row level security;

drop policy if exists "profile restrictions read parties" on public.profile_restrictions;
create policy "profile restrictions read parties"
on public.profile_restrictions
for select
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(owner_email)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(restricted_email)
);

drop policy if exists "profile restrictions owner insert" on public.profile_restrictions;
create policy "profile restrictions owner insert"
on public.profile_restrictions
for insert
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(owner_email)
);

drop policy if exists "profile restrictions owner delete" on public.profile_restrictions;
create policy "profile restrictions owner delete"
on public.profile_restrictions
for delete
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(owner_email)
);

-- ---------------------------------------------------------
-- POST REACTIONS
-- ---------------------------------------------------------
create table if not exists public.feed_reactions (
  id uuid primary key default gen_random_uuid(),
  upload_id text not null,
  user_email text not null,
  reaction text not null,
  created_at timestamptz not null default now(),
  unique (upload_id, user_email)
);

create index if not exists feed_reactions_upload_idx
  on public.feed_reactions (upload_id);

alter table public.feed_reactions enable row level security;

drop policy if exists "feed reactions readable" on public.feed_reactions;
create policy "feed reactions readable"
on public.feed_reactions
for select
using (true);

drop policy if exists "feed reactions own insert" on public.feed_reactions;
create policy "feed reactions own insert"
on public.feed_reactions
for insert
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(user_email)
);

drop policy if exists "feed reactions own update" on public.feed_reactions;
create policy "feed reactions own update"
on public.feed_reactions
for update
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(user_email)
)
with check (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(user_email)
);

drop policy if exists "feed reactions own delete" on public.feed_reactions;
create policy "feed reactions own delete"
on public.feed_reactions
for delete
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(user_email)
);

-- ---------------------------------------------------------
-- VISUAL FILTERS
-- ---------------------------------------------------------
alter table if exists public.uploads
  add column if not exists visual_filter text not null default 'none';

alter table if exists public.stories
  add column if not exists visual_filter text not null default 'none';

-- ---------------------------------------------------------
-- VUEWE TAP — intentional in-person connect
-- ---------------------------------------------------------
create table if not exists public.vuewe_tap_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_email text not null,
  guest_email text,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  check (status in ('waiting','connected','expired'))
);

create index if not exists vuewe_tap_host_idx
  on public.vuewe_tap_sessions (lower(host_email), created_at desc);

alter table public.vuewe_tap_sessions enable row level security;

drop policy if exists "tap parties read" on public.vuewe_tap_sessions;
create policy "tap parties read"
on public.vuewe_tap_sessions
for select
using (
  lower(coalesce(auth.jwt() ->> 'email','')) = lower(host_email)
  or lower(coalesce(auth.jwt() ->> 'email','')) = lower(coalesce(guest_email,''))
);

create or replace function public.vuewe_create_tap()
returns table(code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_code text;
  v_exp timestamptz := now() + interval '5 minutes';
begin
  if v_email = '' then
    raise exception 'Not signed in';
  end if;

  update public.vuewe_tap_sessions
  set status = 'expired'
  where lower(host_email) = v_email
    and status = 'waiting';

  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.vuewe_tap_sessions s
      where s.code = v_code and s.expires_at > now()
    );
  end loop;

  insert into public.vuewe_tap_sessions(code, host_email, status, expires_at)
  values (v_code, v_email, 'waiting', v_exp);

  return query select v_code, v_exp;
end;
$$;

create or replace function public.vuewe_join_tap(p_code text)
returns table(host_email text, guest_email text, status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest text := lower(coalesce(auth.jwt() ->> 'email',''));
  v_host text;
  v_code text := upper(trim(coalesce(p_code,'')));
begin
  if v_guest = '' then
    raise exception 'Not signed in';
  end if;

  select lower(s.host_email)
  into v_host
  from public.vuewe_tap_sessions s
  where s.code = v_code
    and s.status = 'waiting'
    and s.expires_at > now()
  order by s.created_at desc
  limit 1
  for update;

  if v_host is null then
    raise exception 'Tap code expired or unavailable';
  end if;

  if v_host = v_guest then
    raise exception 'Use this code on the other person''s phone';
  end if;

  update public.vuewe_tap_sessions
  set guest_email = v_guest,
      status = 'connected'
  where code = v_code
    and status = 'waiting';

  insert into public.follows(follower_email, following_email)
  select v_host, v_guest
  where not exists (
    select 1 from public.follows
    where lower(follower_email) = v_host
      and lower(following_email) = v_guest
  );

  insert into public.follows(follower_email, following_email)
  select v_guest, v_host
  where not exists (
    select 1 from public.follows
    where lower(follower_email) = v_guest
      and lower(following_email) = v_host
  );

  insert into public.notifications(
    user_email, actor_email, type, title, message, link, is_read
  )
  values
    (v_host, v_guest, 'follow', '⚡ VUEWE Tap connected', 'You connected in person on VUEWE.', '/follows', false),
    (v_guest, v_host, 'follow', '⚡ VUEWE Tap connected', 'You connected in person on VUEWE.', '/follows', false);

  return query select v_host, v_guest, 'connected'::text;
end;
$$;

grant execute on function public.vuewe_create_tap() to authenticated;
grant execute on function public.vuewe_join_tap(text) to authenticated;
