/* =========================================================
   VUEWE OG FIRST 100 V2
   - preserves every existing OG number
   - stops awarding on raw signup
   - awards only after a creator profile is actually completed
   - fills the lowest open number from 001-100 under an advisory lock
   - never awards 101+
   ========================================================= */

create unique index if not exists utv_badges_og_number_unique
on public.utv_badges (og_number)
where og_number is not null;

drop trigger if exists assign_utv_og_after_signup on auth.users;
drop trigger if exists utv_assign_og_on_signup on auth.users;

create or replace function public.assign_vuewe_og_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_next integer;
  v_existing integer;
begin
  -- A completed VUEWE identity is the qualification gate.
  if coalesce(trim(new.display_name), '') = ''
     or coalesce(trim(new.username), '') = '' then
    return new;
  end if;

  select u.id
    into v_user_id
  from auth.users u
  where lower(coalesce(u.email, '')) = lower(trim(new.email))
  limit 1;

  if v_user_id is null then
    return new;
  end if;

  select b.og_number
    into v_existing
  from public.utv_badges b
  where b.user_id = v_user_id
     or lower(b.user_email) = lower(trim(new.email))
  limit 1;

  if v_existing between 1 and 100 then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('vuewe_first_100_og_badges'));

  -- Re-check after the lock in case another request assigned it first.
  select b.og_number
    into v_existing
  from public.utv_badges b
  where b.user_id = v_user_id
     or lower(b.user_email) = lower(trim(new.email))
  limit 1;

  if v_existing between 1 and 100 then
    return new;
  end if;

  select min(slot)
    into v_next
  from pg_catalog.generate_series(1, 100) as slot
  where not exists (
    select 1
    from public.utv_badges b
    where b.og_number = slot
  );

  -- All 100 limited slots are gone.
  if v_next is null then
    return new;
  end if;

  if exists (
    select 1
    from public.utv_badges b
    where b.user_id = v_user_id
       or lower(b.user_email) = lower(trim(new.email))
  ) then
    update public.utv_badges
    set user_id = v_user_id,
        user_email = lower(trim(new.email)),
        og_number = v_next,
        claimed_at = coalesce(claimed_at, now())
    where user_id = v_user_id
       or lower(user_email) = lower(trim(new.email));
  else
    insert into public.utv_badges (
      user_id,
      user_email,
      og_number,
      is_ceo,
      claimed_at
    )
    values (
      v_user_id,
      lower(trim(new.email)),
      v_next,
      false,
      now()
    );
  end if;

  return new;
end;
$$;

revoke all on function public.assign_vuewe_og_for_profile() from public;
revoke all on function public.assign_vuewe_og_for_profile() from anon;
revoke all on function public.assign_vuewe_og_for_profile() from authenticated;

drop trigger if exists vuewe_assign_og_on_profile_qualified on public.creator_profiles;
create trigger vuewe_assign_og_on_profile_qualified
after insert or update of display_name, username
on public.creator_profiles
for each row
execute function public.assign_vuewe_og_for_profile();

-- Read helpers remain capped to the limited 100.
create or replace function public.get_utv_og_spots_remaining()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    0,
    100 - count(*)::integer
  )
  from public.utv_badges
  where og_number between 1 and 100;
$$;

revoke all on function public.get_utv_og_spots_remaining() from public;
revoke all on function public.get_utv_og_spots_remaining() from anon;
grant execute on function public.get_utv_og_spots_remaining() to authenticated;
