-- UTV WATCH 3.0

alter table public.uploads
  add column if not exists featured boolean not null default false,
  add column if not exists utv_original boolean not null default false,
  add column if not exists watch_hero boolean not null default false,
  add column if not exists watch_rank integer,
  add column if not exists edit_requested boolean not null default false,
  add column if not exists edit_request_note text;

create or replace function public.utv_is_ceo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.utv_badges
    where lower(user_email) =
      lower(coalesce(auth.jwt() ->> 'email',''))
      and is_ceo = true
  );
$$;

create or replace function public.protect_approved_watch_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer_email text :=
    lower(coalesce(auth.jwt() ->> 'email',''));
  viewer_is_ceo boolean :=
    public.utv_is_ceo();
begin
  if viewer_is_ceo then
    return case
      when TG_OP = 'DELETE' then OLD
      else NEW
    end;
  end if;

  if lower(coalesce(OLD.creator_email,'')) <> viewer_email then
    raise exception 'You do not own this UTV content.';
  end if;

  if OLD.approved = true then
    if TG_OP = 'DELETE' then
      raise exception 'Approved UTV content cannot be deleted by the creator.';
    end if;

    if
      (
        to_jsonb(NEW)
        - array[
            'edit_requested',
            'edit_request_note'
          ]::text[]
      )
      is distinct from
      (
        to_jsonb(OLD)
        - array[
            'edit_requested',
            'edit_request_note'
          ]::text[]
      )
    then
      raise exception 'Approved UTV content is locked. Request an edit from UTV.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists
  protect_approved_watch_content_trigger
on public.uploads;

create trigger
  protect_approved_watch_content_trigger
before update or delete
on public.uploads
for each row
execute function
  public.protect_approved_watch_content();

alter table public.uploads
enable row level security;

drop policy if exists
  "UTV creators update own Watch content"
on public.uploads;

create policy
  "UTV creators update own Watch content"
on public.uploads
for update
to authenticated
using (
  lower(creator_email) =
    lower(coalesce(auth.jwt() ->> 'email',''))
  or public.utv_is_ceo()
)
with check (
  lower(creator_email) =
    lower(coalesce(auth.jwt() ->> 'email',''))
  or public.utv_is_ceo()
);

drop policy if exists
  "UTV creators delete pending Watch content"
on public.uploads;

create policy
  "UTV creators delete pending Watch content"
on public.uploads
for delete
to authenticated
using (
  public.utv_is_ceo()
  or (
    lower(creator_email) =
      lower(coalesce(auth.jwt() ->> 'email',''))
    and approved = false
  )
);
