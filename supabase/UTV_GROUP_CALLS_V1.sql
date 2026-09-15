-- =========================================================
-- UTV GROUP CALLS V1
-- Backwards-compatible foundation for 1–4 person calls
-- =========================================================


-- ---------------------------------------------------------
-- 1. CALL CAPACITY
-- Existing calls remain 2-person calls.
-- Future group calls can set this to 3 or 4.
-- ---------------------------------------------------------

alter table public.call_sessions
add column if not exists max_participants smallint
not null default 2;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'call_sessions_max_participants_check'
      and conrelid =
        'public.call_sessions'::regclass
  ) then
    alter table public.call_sessions
    add constraint
      call_sessions_max_participants_check
    check (
      max_participants between 2 and 4
    );
  end if;
end
$$;


-- ---------------------------------------------------------
-- 2. CALL MEMBERS
-- caller/callee stay on call_sessions for compatibility.
-- Extra participants live here.
-- ---------------------------------------------------------

create table if not exists public.call_members (
  id uuid primary key
    default gen_random_uuid(),

  call_id uuid not null
    references public.call_sessions(id)
    on delete cascade,

  member_email text not null,

  role text not null default 'member'
    check (
      role in ('host', 'member')
    ),

  status text not null default 'invited'
    check (
      status in (
        'invited',
        'joined',
        'declined',
        'left'
      )
    ),

  invited_by text,

  created_at timestamptz
    not null default now(),

  joined_at timestamptz,

  left_at timestamptz,

  constraint call_members_call_email_unique
    unique (
      call_id,
      member_email
    )
);


create index if not exists
call_members_call_idx
on public.call_members (
  call_id
);


create index if not exists
call_members_email_idx
on public.call_members (
  lower(member_email)
);


create index if not exists
call_members_status_idx
on public.call_members (
  call_id,
  status
);


-- ---------------------------------------------------------
-- 3. BACKFILL EXISTING CALLS
-- Existing caller becomes host.
-- Existing callee becomes the primary member.
-- ---------------------------------------------------------

insert into public.call_members (
  call_id,
  member_email,
  role,
  status,
  invited_by,
  created_at,
  joined_at
)
select
  id,
  lower(caller_email),
  'host',
  'joined',
  lower(caller_email),
  created_at,
  created_at
from public.call_sessions
on conflict (
  call_id,
  member_email
)
do nothing;


insert into public.call_members (
  call_id,
  member_email,
  role,
  status,
  invited_by,
  created_at,
  joined_at,
  left_at
)
select
  id,

  lower(callee_email),

  'member',

  case
    when status = 'ringing'
      then 'invited'

    when status = 'accepted'
      then 'joined'

    when status = 'declined'
      then 'declined'

    when status in (
      'ended',
      'missed'
    )
      then 'left'

    else 'invited'
  end,

  lower(caller_email),

  created_at,

  case
    when status = 'accepted'
      then coalesce(
        answered_at,
        created_at
      )
    else null
  end,

  case
    when status in (
      'ended',
      'missed'
    )
      then coalesce(
        ended_at,
        created_at
      )
    else null
  end

from public.call_sessions

on conflict (
  call_id,
  member_email
)
do nothing;


-- ---------------------------------------------------------
-- 4. KEEP LEGACY 1-TO-1 CALLS SYNCHRONIZED
-- Any current code that creates caller/callee calls
-- automatically creates call_members too.
-- ---------------------------------------------------------

create or replace function
public.utv_sync_primary_call_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_status text;
begin

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
    new.id,
    lower(new.caller_email),
    'host',
    'joined',
    lower(new.caller_email),
    new.created_at,
    new.created_at
  )
  on conflict (
    call_id,
    member_email
  )
  do update set
    role = 'host';


  primary_status :=
    case
      when new.status = 'ringing'
        then 'invited'

      when new.status = 'accepted'
        then 'joined'

      when new.status = 'declined'
        then 'declined'

      when new.status in (
        'ended',
        'missed'
      )
        then 'left'

      else 'invited'
    end;


  insert into public.call_members (
    call_id,
    member_email,
    role,
    status,
    invited_by,
    created_at,
    joined_at,
    left_at
  )
  values (
    new.id,
    lower(new.callee_email),
    'member',
    primary_status,
    lower(new.caller_email),
    new.created_at,

    case
      when primary_status = 'joined'
        then coalesce(
          new.answered_at,
          now()
        )
      else null
    end,

    case
      when primary_status = 'left'
        then coalesce(
          new.ended_at,
          now()
        )
      else null
    end
  )

  on conflict (
    call_id,
    member_email
  )

  do update set

    status =
      excluded.status,

    joined_at =
      case
        when excluded.status = 'joined'
          then coalesce(
            public.call_members.joined_at,
            excluded.joined_at,
            now()
          )
        else
          public.call_members.joined_at
      end,

    left_at =
      case
        when excluded.status = 'left'
          then coalesce(
            public.call_members.left_at,
            excluded.left_at,
            now()
          )
        else
          public.call_members.left_at
      end;


  if new.status in (
    'ended',
    'missed'
  ) then

    update public.call_members

    set
      status = 'left',
      left_at =
        coalesce(
          left_at,
          new.ended_at,
          now()
        )

    where
      call_id = new.id
      and status in (
        'invited',
        'joined'
      );

  end if;


  return new;
end;
$$;


drop trigger if exists
utv_sync_primary_call_members_trigger
on public.call_sessions;


create trigger
utv_sync_primary_call_members_trigger

after insert
or update of status

on public.call_sessions

for each row

execute function
public.utv_sync_primary_call_members();


-- ---------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Members may directly see their own membership.
-- Mutation will go through protected RPC functions.
-- ---------------------------------------------------------

alter table public.call_members
enable row level security;


drop policy if exists
"users can read own call membership"
on public.call_members;


create policy
"users can read own call membership"

on public.call_members

for select

to authenticated

using (
  lower(member_email) =
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    )
);


grant select
on public.call_members
to authenticated;


-- ---------------------------------------------------------
-- 6. ALLOW GROUP MEMBERS TO READ THEIR CALL SESSION
-- Existing caller/callee behavior remains unchanged.
-- ---------------------------------------------------------

drop policy if exists
"call participants can read"
on public.call_sessions;


create policy
"call participants can read"

on public.call_sessions

for select

to authenticated

using (

  lower(caller_email) =
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    )

  or

  lower(callee_email) =
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    )

  or

  exists (
    select 1
    from public.call_members member

    where
      member.call_id =
        call_sessions.id

      and lower(
        member.member_email
      ) =
        lower(
          coalesce(
            auth.jwt() ->> 'email',
            ''
          )
        )
  )
);


-- ---------------------------------------------------------
-- 7. SECURE HOST INVITE FUNCTION
-- Only the original caller/host can add people.
-- Capacity is enforced server-side.
-- ---------------------------------------------------------

create or replace function
public.utv_add_call_member(
  p_call_id uuid,
  p_member_email text
)
returns public.call_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;

  clean_member_email text;

  call_row
    public.call_sessions%rowtype;

  existing_member
    public.call_members%rowtype;

  active_count integer;

  result_row
    public.call_members%rowtype;
begin

  current_email :=
    lower(
      trim(
        coalesce(
          auth.jwt() ->> 'email',
          ''
        )
      )
    );


  if current_email = '' then
    raise exception
      'UTV login required.';
  end if;


  clean_member_email :=
    lower(
      trim(
        coalesce(
          p_member_email,
          ''
        )
      )
    );


  if clean_member_email = '' then
    raise exception
      'Choose a UTV user.';
  end if;


  select *
  into call_row

  from public.call_sessions

  where id = p_call_id;


  if not found then
    raise exception
      'Call not found.';
  end if;


  if lower(
    call_row.caller_email
  ) <> current_email then

    raise exception
      'Only the call host can invite people.';
  end if;


  if call_row.status in (
    'declined',
    'missed',
    'ended'
  ) then

    raise exception
      'This call has ended.';
  end if;


  if clean_member_email =
    current_email then

    raise exception
      'You are already in this call.';
  end if;


  select *
  into existing_member

  from public.call_members

  where
    call_id = p_call_id

    and member_email =
      clean_member_email;


  if found
    and existing_member.status
      in ('invited', 'joined') then

    return existing_member;
  end if;


  select count(*)
  into active_count

  from public.call_members

  where
    call_id = p_call_id

    and status in (
      'invited',
      'joined'
    );


  if active_count >=
    call_row.max_participants then

    raise exception
      'This call is full.';
  end if;


  insert into public.call_members (
    call_id,
    member_email,
    role,
    status,
    invited_by
  )

  values (
    p_call_id,
    clean_member_email,
    'member',
    'invited',
    current_email
  )

  on conflict (
    call_id,
    member_email
  )

  do update set
    role = 'member',
    status = 'invited',
    invited_by =
      excluded.invited_by,
    left_at = null

  returning *
  into result_row;


  return result_row;
end;
$$;


-- ---------------------------------------------------------
-- 8. MEMBER ACCEPT / DECLINE / LEAVE
-- ---------------------------------------------------------

create or replace function
public.utv_set_call_member_status(
  p_call_id uuid,
  p_status text
)
returns public.call_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;

  result_row
    public.call_members%rowtype;
begin

  current_email :=
    lower(
      trim(
        coalesce(
          auth.jwt() ->> 'email',
          ''
        )
      )
    );


  if current_email = '' then
    raise exception
      'UTV login required.';
  end if;


  if p_status not in (
    'joined',
    'declined',
    'left'
  ) then

    raise exception
      'Invalid call status.';
  end if;


  update public.call_members

  set
    status = p_status,

    joined_at =
      case
        when p_status = 'joined'
          then coalesce(
            joined_at,
            now()
          )
        else joined_at
      end,

    left_at =
      case
        when p_status = 'left'
          then coalesce(
            left_at,
            now()
          )
        else left_at
      end

  where
    call_id = p_call_id

    and member_email =
      current_email

  returning *
  into result_row;


  if not found then
    raise exception
      'You are not part of this call.';
  end if;


  return result_row;
end;
$$;


-- ---------------------------------------------------------
-- 9. SAFE PARTICIPANT LIST
-- Lets any authorized call participant see the room list.
-- ---------------------------------------------------------

create or replace function
public.utv_get_call_members(
  p_call_id uuid
)
returns setof public.call_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;

  authorized boolean;
begin

  current_email :=
    lower(
      trim(
        coalesce(
          auth.jwt() ->> 'email',
          ''
        )
      )
    );


  select exists (

    select 1

    from public.call_sessions call

    where
      call.id = p_call_id

      and (
        lower(
          call.caller_email
        ) = current_email

        or

        lower(
          call.callee_email
        ) = current_email
      )

  )

  or exists (

    select 1

    from public.call_members member

    where
      member.call_id =
        p_call_id

      and member.member_email =
        current_email

  )

  into authorized;


  if not authorized then
    raise exception
      'You are not part of this call.';
  end if;


  return query

  select member.*

  from public.call_members member

  where
    member.call_id =
      p_call_id

  order by
    case
      when member.role = 'host'
        then 0
      else 1
    end,

    member.created_at;
end;
$$;


-- ---------------------------------------------------------
-- 10. FUNCTION PERMISSIONS
-- ---------------------------------------------------------

revoke all
on function
public.utv_add_call_member(uuid, text)
from public;

revoke all
on function
public.utv_set_call_member_status(uuid, text)
from public;

revoke all
on function
public.utv_get_call_members(uuid)
from public;


grant execute
on function
public.utv_add_call_member(uuid, text)
to authenticated;

grant execute
on function
public.utv_set_call_member_status(uuid, text)
to authenticated;

grant execute
on function
public.utv_get_call_members(uuid)
to authenticated;


-- ---------------------------------------------------------
-- 11. QUICK VERIFY
-- ---------------------------------------------------------

select
  count(*) as call_sessions
from public.call_sessions;


select
  count(*) as call_members
from public.call_members;
