-- VUEWE PERFORMANCE V39
-- Batch Feed tagged people to avoid one RPC per post.

create or replace function public.utv_get_content_tags_batch(
  p_content_kind text,
  p_content_ids text[]
)
returns table(
  content_id text,
  username text,
  display_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  select
    ct.content_id::text,
    cp.username::text,
    coalesce(
      nullif(trim(cp.display_name),''),
      nullif(trim(cp.username),''),
      'VUEWE Creator'
    )::text,
    cp.avatar_url::text
  from public.content_tags ct
  join public.creator_profiles cp
    on lower(cp.email)=lower(ct.tagged_email)
  where ct.content_kind = public.utv_normalize_content_kind(p_content_kind)
    and ct.content_id = any(coalesce(p_content_ids,array[]::text[]))
  order by ct.content_id, ct.created_at asc;
$$;

revoke all on function public.utv_get_content_tags_batch(text,text[]) from public;
grant execute on function public.utv_get_content_tags_batch(text,text[]) to anon, authenticated;
