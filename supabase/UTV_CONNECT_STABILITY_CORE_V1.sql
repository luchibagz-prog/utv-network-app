-- =========================================================
-- UTV CONNECT STABILITY CORE V1
-- Calls + Video Calls + Walkie authoritative session helpers
-- Safe to run more than once.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. REALTIME TABLES
-- ---------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.call_sessions;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.call_members;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.walkie_rooms;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.walkie_members;
  exception when duplicate_object then null;
  end;
end
$$;


-- ---------------------------------------------------------
-- 2. AUTHORITATIVE CALL START
-- One active outgoing session per caller.
-- Returns the call_id expected by app/calls/page.tsx.
-- ---------------------------------------------------------
create or replace function public.utv_begin_call_v3(
  p_callee_email text,
  p_call_type text default 'audio',
  p_max_participants smallint default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  clean_callee text;
  clean_type text;
  max_people smallint;
  new_id uuid;
  new_room_name text;
begin
  current_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  clean_callee := lower(trim(coalesce(p_callee_email, '')));
  clean_type := lower(trim(coalesce(p_call_type, 'audio')));
  max_people := greatest(2, least(coalesce(p_max_participants, 2), 4));

  if current_email = '' then
    raise exception 'UTV login required.';
  end if;

  if clean_callee = '' then
    raise exception 'Choose a UTV user.';
  end if;

  if clean_callee = current_email then
    raise exception 'Choose another UTV user.';
  end if;

  if clean_type not in ('audio', 'video') then
    raise exception 'Invalid call type.';
  end if;

  -- Close stale outgoing sessions before creating the next one.
  update public.call_sessions
  set
    status = 'ended',
    ended_at = coalesce(ended_at, now())
  where lower(caller_email) = current_email
    and status in ('ringing', 'accepted');

  new_id := gen_random_uuid();
  new_room_name := 'utv-call-' || new_id::text;

  insert into public.call_sessions (
    id,
    caller_email,
    callee_email,
    call_type,
    room_name,
    status,
    max_participants,
    created_at
  )
  values (
    new_id,
    current_email,
    clean_callee,
    clean_type,
    new_room_name,
    'ringing',
    max_people,
    now()
  );

  -- Do not rely only on a trigger for the two primary seats.
  insert into public.call_members (
    call_id,
    member_email,
    role,
    status,
    invited_by,
    created_at,
    joined_at
  )
  values (
    new_id,
    current_email,
    'host',
    'joined',
    current_email,
    now(),
    now()
  )
  on conflict (call_id, member_email)
  do update set
    role = 'host',
    status = 'joined',
    left_at = null;

  insert into public.call_members (
    call_id,
    member_email,
    role,
    status,
    invited_by,
    created_at
  )
  values (
    new_id,
    clean_callee,
    'member',
    'invited',
    current_email,
    now()
  )
  on conflict (call_id, member_email)
  do update set
    role = 'member',
    status = 'invited',
    invited_by = excluded.invited_by,
    joined_at = null,
    left_at = null;

  return jsonb_build_object(
    'call_id', new_id,
    'room_name', new_room_name,
    'status', 'ringing',
    'call_type', clean_type,
    'max_participants', max_people
  );
end;
$$;


-- ---------------------------------------------------------
-- 3. AUTHORITATIVE CALL END
-- Either participant in a direct call or the host/member
-- already authorized for the session can end their call path.
-- ---------------------------------------------------------
drop function if exists public.utv_end_call_v3(uuid);

create or replace function public.utv_end_call_v3(
  p_call_id uuid
)
returns public.call_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  row_value public.call_sessions%rowtype;
  authorized boolean := false;
begin
  current_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if current_email = '' then
    raise exception 'UTV login required.';
  end if;

  select *
  into row_value
  from public.call_sessions
  where id = p_call_id
  for update;

  if not found then
    raise exception 'Call not found.';
  end if;

  authorized :=
    lower(row_value.caller_email) = current_email
    or lower(row_value.callee_email) = current_email
    or exists (
      select 1
      from public.call_members member
      where member.call_id = p_call_id
        and lower(member.member_email) = current_email
        and member.status in ('joined', 'invited')
    );

  if not authorized then
    raise exception 'You are not part of this call.';
  end if;

  if row_value.status not in ('ended', 'declined', 'missed') then
    update public.call_sessions
    set
      status = 'ended',
      ended_at = coalesce(ended_at, now())
    where id = p_call_id
    returning * into row_value;
  end if;

  update public.call_members
  set
    status = case
      when status = 'declined' then 'declined'
      else 'left'
    end,
    left_at = case
      when status = 'declined' then left_at
      else coalesce(left_at, now())
    end
  where call_id = p_call_id
    and status in ('invited', 'joined');

  return row_value;
end;
$$;


-- ---------------------------------------------------------
-- 4. WALKIE FLOOR LOCK
-- Exactly one person owns the microphone floor at a time.
-- ---------------------------------------------------------
create or replace function public.utv_walkie_claim_floor(
  p_room_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  room_value public.walkie_rooms%rowtype;
begin
  current_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if current_email = '' then
    raise exception 'UTV login required.';
  end if;

  select *
  into room_value
  from public.walkie_rooms
  where id = p_room_id
  for update;

  if not found or room_value.status <> 'active' then
    raise exception 'This Walkie channel is not active.';
  end if;

  if not exists (
    select 1
    from public.walkie_members member
    where member.room_id = p_room_id
      and lower(member.user_email) = current_email
      and member.status = 'joined'
  ) then
    raise exception 'Join the Walkie channel first.';
  end if;

  if room_value.current_speaker_email is not null
     and lower(room_value.current_speaker_email) <> current_email then
    return false;
  end if;

  update public.walkie_rooms
  set current_speaker_email = current_email
  where id = p_room_id;

  return true;
end;
$$;


create or replace function public.utv_walkie_release_floor(
  p_room_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  current_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if current_email = '' then
    return;
  end if;

  update public.walkie_rooms
  set current_speaker_email = null
  where id = p_room_id
    and lower(coalesce(current_speaker_email, '')) = current_email;
end;
$$;


-- Clear a stuck Walkie floor if the speaker leaves/declines.
create or replace function public.utv_release_walkie_floor_on_member_exit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'joined' then
    update public.walkie_rooms
    set current_speaker_email = null
    where id = new.room_id
      and lower(coalesce(current_speaker_email, '')) = lower(new.user_email);
  end if;

  return new;
end;
$$;


drop trigger if exists utv_release_walkie_floor_member_exit
on public.walkie_members;

create trigger utv_release_walkie_floor_member_exit
after update of status
on public.walkie_members
for each row
execute function public.utv_release_walkie_floor_on_member_exit();


-- ---------------------------------------------------------
-- 5. PERMISSIONS
-- ---------------------------------------------------------
revoke all on function public.utv_begin_call_v3(text, text, smallint) from public, anon;
revoke all on function public.utv_end_call_v3(uuid) from public, anon;
revoke all on function public.utv_walkie_claim_floor(uuid) from public, anon;
revoke all on function public.utv_walkie_release_floor(uuid) from public, anon;

grant execute on function public.utv_begin_call_v3(text, text, smallint) to authenticated;
grant execute on function public.utv_end_call_v3(uuid) to authenticated;
grant execute on function public.utv_walkie_claim_floor(uuid) to authenticated;
grant execute on function public.utv_walkie_release_floor(uuid) to authenticated;
