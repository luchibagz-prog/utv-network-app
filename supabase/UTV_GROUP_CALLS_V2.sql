-- =========================================================
-- UTV GROUP CALLS V2
-- Group-safe Accept / Decline behavior
-- =========================================================


-- ---------------------------------------------------------
-- 1. UPDATE THE LEGACY SYNC TRIGGER
--
-- 2-person calls keep legacy behavior.
--
-- Group calls:
-- - session "accepted" means the room is active
-- - it does NOT automatically mean the primary callee joined
-- - each member controls their own membership status
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

  -- Host/caller always exists as joined.
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


  -- Existing 1-to-1 calls keep old behavior.
  if new.max_participants <= 2 then

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
      status = excluded.status,

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


  else

    -- Group call:
    -- Create the primary invite if missing,
    -- but never fake an Accept for them.
    insert into public.call_members (
      call_id,
      member_email,
      role,
      status,
      invited_by,
      created_at
    )
    values (
      new.id,
      lower(new.callee_email),
      'member',
      'invited',
      lower(new.caller_email),
      new.created_at
    )

    on conflict (
      call_id,
      member_email
    )
    do nothing;

  end if;


  -- Ending the room ends every active membership.
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



-- ---------------------------------------------------------
-- 2. ACCEPT CALL INVITE
--
-- Works for primary callee OR added group member.
-- First accepted member activates the call session.
-- ---------------------------------------------------------

create or replace function
public.utv_accept_call_invite(
  p_call_id uuid
)
returns public.call_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;

  call_row
    public.call_sessions%rowtype;

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


  select *
  into call_row

  from public.call_sessions

  where id = p_call_id

  for update;


  if not found then
    raise exception
      'Call not found.';
  end if;


  if call_row.status in (
    'declined',
    'missed',
    'ended'
  ) then

    raise exception
      'This call is no longer available.';
  end if;


  update public.call_members

  set
    status = 'joined',

    joined_at =
      coalesce(
        joined_at,
        now()
      ),

    left_at = null

  where
    call_id = p_call_id

    and lower(member_email) =
      current_email

    and status in (
      'invited',
      'joined'
    )

  returning *
  into result_row;


  if not found then
    raise exception
      'You do not have an active invitation to this call.';
  end if;


  -- First accepted participant starts the room.
  if call_row.status = 'ringing' then

    update public.call_sessions

    set
      status = 'accepted',

      answered_at =
        coalesce(
          answered_at,
          now()
        )

    where id = p_call_id;

  end if;


  return result_row;
end;
$$;



-- ---------------------------------------------------------
-- 3. DECLINE CALL INVITE
--
-- Group call:
-- only this member declines.
--
-- 1-to-1 call:
-- preserves old behavior and ends the ringing call.
-- ---------------------------------------------------------

create or replace function
public.utv_decline_call_invite(
  p_call_id uuid
)
returns public.call_members
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;

  call_row
    public.call_sessions%rowtype;

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


  select *
  into call_row

  from public.call_sessions

  where id = p_call_id

  for update;


  if not found then
    raise exception
      'Call not found.';
  end if;


  update public.call_members

  set
    status = 'declined',

    left_at = null

  where
    call_id = p_call_id

    and lower(member_email) =
      current_email

    and role <> 'host'

    and status in (
      'invited',
      'declined'
    )

  returning *
  into result_row;


  if not found then
    raise exception
      'You do not have an invitation to decline.';
  end if;


  -- Only a normal 2-person call is fully declined.
  if call_row.max_participants <= 2 then

    update public.call_sessions

    set
      status = 'declined',

      ended_at =
        coalesce(
          ended_at,
          now()
        )

    where id = p_call_id

      and status = 'ringing';

  end if;


  return result_row;
end;
$$;



-- ---------------------------------------------------------
-- 4. LEAVE A GROUP CALL
--
-- A member leaving does NOT kill everybody else's room.
-- Host ending the room will still use call_sessions ended.
-- ---------------------------------------------------------

create or replace function
public.utv_leave_call(
  p_call_id uuid
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


  update public.call_members

  set
    status = 'left',

    left_at =
      coalesce(
        left_at,
        now()
      )

  where
    call_id = p_call_id

    and lower(member_email) =
      current_email

    and role <> 'host'

    and status = 'joined'

  returning *
  into result_row;


  if not found then
    raise exception
      'Could not leave this call.';
  end if;


  return result_row;
end;
$$;



-- ---------------------------------------------------------
-- 5. PERMISSIONS
-- ---------------------------------------------------------

revoke all
on function
public.utv_accept_call_invite(uuid)
from public;

revoke all
on function
public.utv_decline_call_invite(uuid)
from public;

revoke all
on function
public.utv_leave_call(uuid)
from public;


grant execute
on function
public.utv_accept_call_invite(uuid)
to authenticated;

grant execute
on function
public.utv_decline_call_invite(uuid)
to authenticated;

grant execute
on function
public.utv_leave_call(uuid)
to authenticated;



-- ---------------------------------------------------------
-- 6. VERIFY
-- ---------------------------------------------------------

select
  max_participants,
  count(*) as calls
from public.call_sessions
group by max_participants
order by max_participants;
