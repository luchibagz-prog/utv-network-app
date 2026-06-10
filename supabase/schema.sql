create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'viewer' check (role in ('viewer', 'creator', 'admin')),
  created_at timestamp with time zone default now()
);

create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('show', 'podcast', 'movie', 'trailer', 'music_video', 'live_event')),
  city text,
  cover_url text,
  video_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  is_paid boolean default false,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;
alter table submissions enable row level security;

create policy "Users can read own profile"
on profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
on profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update using (auth.uid() = id);

create policy "Public can view approved submissions"
on submissions for select using (status = 'approved');

create policy "Creators can view own submissions"
on submissions for select using (auth.uid() = user_id);

create policy "Creators can insert own submissions"
on submissions for insert with check (auth.uid() = user_id);

create policy "Creators can update own pending submissions"
on submissions for update using (auth.uid() = user_id and status = 'pending');
