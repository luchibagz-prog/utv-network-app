create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),

  caller_email text not null,
  callee_email text not null,

  call_type text not null default 'audio'
    check (
      call_type in ('audio','video')
    ),

  room_name text not null unique,

  status text not null default 'ringing'
    check (
      status in (
        'ringing',
        'accepted',
        'declined',
        'missed',
        'ended'
      )
    ),

  created_at timestamptz
    not null default now(),

  answered_at timestamptz,

  ended_at timestamptz
);

create index if not exists
call_sessions_caller_idx
on public.call_sessions (
  lower(caller_email)
);

create index if not exists
call_sessions_callee_idx
on public.call_sessions (
  lower(callee_email)
);

create index if not exists
call_sessions_status_idx
on public.call_sessions (
  status
);

alter table public.call_sessions
enable row level security;

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
);

drop policy if exists
"users can start calls"
on public.call_sessions;

create policy
"users can start calls"
on public.call_sessions
for insert
to authenticated
with check (
  lower(caller_email) =
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    )
);

drop policy if exists
"call participants can update"
on public.call_sessions;

create policy
"call participants can update"
on public.call_sessions
for update
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
)
with check (
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
);
