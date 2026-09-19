create extension if not exists pgcrypto;

create table if not exists public.badge_definitions (
  key text primary key,
  name text not null,
  kicker text,
  subtext text,
  description text,
  category text not null default 'achievement',
  tier text not null default 'core',
  shape text not null default 'patch',
  icon text,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  badge_key text not null references public.badge_definitions(key) on delete cascade,
  serial_number integer,
  featured boolean not null default false,
  source text,
  notes text,
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_badges_user_email
  on public.user_badges (user_email);

create index if not exists idx_user_badges_badge_key
  on public.user_badges (badge_key);

create index if not exists idx_user_badges_featured
  on public.user_badges (user_email, featured desc, awarded_at asc);

alter table public.badge_definitions enable row level security;
alter table public.user_badges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'badge_definitions'
      and policyname = 'badge_definitions_public_read'
  ) then
    create policy badge_definitions_public_read
      on public.badge_definitions
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_badges'
      and policyname = 'user_badges_public_read'
  ) then
    create policy user_badges_public_read
      on public.user_badges
      for select
      using (true);
  end if;
end $$;

insert into public.badge_definitions
  (key, name, kicker, subtext, description, category, tier, shape, icon, sort_order)
values
  ('og_first_100', 'UTV OG', 'ORIGINAL 100', 'FOUNDING MEMBER', 'Awarded to the first 100 active UTV users.', 'status', 'legendary', 'shield', '👑', 1),
  ('ceo', 'CEO', 'OFFICIAL ROLE', 'UTV LEADERSHIP', 'Platform founder or executive role.', 'status', 'legendary', 'coin', '⚡', 2),
  ('verified_creator', 'Verified Creator', 'OFFICIAL', 'APPROVED CREATOR', 'Creator identity verified by UTV.', 'status', 'elite', 'shield', '✔', 3),
  ('top8_elite', 'Top 8 Elite', 'PROFILE FLEX', 'TOP CREW ACTIVE', 'Completed and actively uses Top 8.', 'achievement', 'rare', 'patch', '♛', 4),
  ('live_host', 'Live Host', 'STREAMER', 'GOES LIVE', 'Awarded to users who actively host live sessions.', 'achievement', 'rare', 'stamp', '📡', 5),
  ('booking_ready', 'Booking Ready', 'BUSINESS', 'SERVICES ACTIVE', 'Completed bookings setup and accepts requests.', 'achievement', 'core', 'patch', '📅', 6),
  ('trendsetter', 'Trendsetter', 'TRENDING', 'HIGH MOTION', 'Content or account trending on UTV.', 'achievement', 'elite', 'shield', '🔥', 7),
  ('support_magnet', 'Support Magnet', 'GIFTS', 'FAN SUPPORTED', 'Received strong gifting / support from fans.', 'achievement', 'rare', 'coin', '💎', 8),
  ('city_leader', 'City Leader', 'LOCAL', 'CITY MOTION', 'Recognized leader in a city or local UTV scene.', 'community', 'elite', 'shield', '📍', 9),
  ('story_runner', 'Story Runner', 'STREAK', 'STORIES ACTIVE', 'Maintains strong story activity and consistency.', 'achievement', 'core', 'stamp', '🎞', 10),
  ('utv_pioneer', 'UTV Pioneer', 'EARLY WAVE', 'MISSION COMPLETE', 'Early adopter who completed starter missions.', 'status', 'rare', 'patch', '🚀', 11),
  ('watch_featured', 'Watch Featured', 'WATCH', 'FEATURED CONTENT', 'Content featured on the UTV Watch experience.', 'achievement', 'elite', 'shield', '▶', 12),
  ('event_motion', 'Event Motion', 'EVENTS', 'HOST / PROMOTER', 'Recognized for building or promoting strong events.', 'community', 'rare', 'patch', '🎫', 13)
on conflict (key) do update set
  name = excluded.name,
  kicker = excluded.kicker,
  subtext = excluded.subtext,
  description = excluded.description,
  category = excluded.category,
  tier = excluded.tier,
  shape = excluded.shape,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = true;

create or replace function public.award_utv_badge(
  p_user_email text,
  p_badge_key text,
  p_serial_number integer default null,
  p_featured boolean default false,
  p_source text default null,
  p_notes text default null
)
returns public.user_badges
language plpgsql
security definer
as $$
declare
  inserted_row public.user_badges;
begin
  insert into public.user_badges (
    user_email,
    badge_key,
    serial_number,
    featured,
    source,
    notes
  )
  values (
    lower(trim(p_user_email)),
    p_badge_key,
    p_serial_number,
    p_featured,
    p_source,
    p_notes
  )
  returning * into inserted_row;

  if p_featured then
    update public.user_badges
    set featured = false
    where user_email = lower(trim(p_user_email))
      and id <> inserted_row.id;
    inserted_row.featured := true;
  end if;

  return inserted_row;
end;
$$;
