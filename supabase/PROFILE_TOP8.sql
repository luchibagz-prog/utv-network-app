create table if not exists public.top_crew (
  owner_email text not null,
  member_email text not null,
  position integer not null check (position between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (owner_email, position),
  unique (owner_email, member_email)
);
alter table public.top_crew enable row level security;
drop policy if exists "top crew public read" on public.top_crew;
create policy "top crew public read" on public.top_crew for select using (true);
drop policy if exists "top crew owner insert" on public.top_crew;
create policy "top crew owner insert" on public.top_crew for insert with check ((auth.jwt() ->> 'email') = owner_email);
drop policy if exists "top crew owner delete" on public.top_crew;
create policy "top crew owner delete" on public.top_crew for delete using ((auth.jwt() ->> 'email') = owner_email);
