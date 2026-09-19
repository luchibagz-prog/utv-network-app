/* =========================================================
   UTV BADGE SYSTEM V2
   Secure awards + profile featured patch selection
   ========================================================= */

create unique index if not exists
  idx_user_badges_unique_user_badge
on public.user_badges (
  lower(user_email),
  badge_key
);

create unique index if not exists
  idx_user_badges_one_featured
on public.user_badges (
  lower(user_email)
)
where featured = true;


/* ---------------------------------------------------------
   LOCK DOWN ADMIN AWARD FUNCTION

   Normal UTV users cannot call this RPC.
   Future automated/admin badge awards should use server-side
   service-role logic.
   --------------------------------------------------------- */

revoke all
on function public.award_utv_badge(
  text,
  text,
  integer,
  boolean,
  text,
  text
)
from public;

revoke all
on function public.award_utv_badge(
  text,
  text,
  integer,
  boolean,
  text,
  text
)
from anon;

revoke all
on function public.award_utv_badge(
  text,
  text,
  integer,
  boolean,
  text,
  text
)
from authenticated;

grant execute
on function public.award_utv_badge(
  text,
  text,
  integer,
  boolean,
  text,
  text
)
to service_role;


/* ---------------------------------------------------------
   USER MAY FEATURE ONLY A BADGE THEY ACTUALLY OWN
   --------------------------------------------------------- */

create or replace function
public.set_my_featured_utv_badge(
  p_badge_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_target public.user_badges;
begin

  v_email :=
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    );

  if v_email = '' then
    raise exception
      'Authentication required';
  end if;

  select *
  into v_target
  from public.user_badges
  where id = p_badge_id
    and lower(user_email) =
        v_email
  limit 1;

  if not found then
    raise exception
      'Badge not found for this user';
  end if;

  update public.user_badges
  set featured = false
  where lower(user_email) =
        v_email;

  update public.user_badges
  set featured = true
  where id = p_badge_id;

end;
$$;

revoke all
on function
public.set_my_featured_utv_badge(uuid)
from public;

revoke all
on function
public.set_my_featured_utv_badge(uuid)
from anon;

grant execute
on function
public.set_my_featured_utv_badge(uuid)
to authenticated;
