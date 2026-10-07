/* VUEWE Story filters: metadata only.
   Filters render only inside Story editor/share/viewer.
   Feed posts are untouched. */

alter table public.stories
  add column if not exists story_filter text not null default 'original';

update public.stories
set story_filter = 'original'
where story_filter is null
   or story_filter not in ('original','clean','warm','cool','rich','mono');

alter table public.stories
  drop constraint if exists stories_story_filter_check;

alter table public.stories
  add constraint stories_story_filter_check
  check (story_filter in ('original','clean','warm','cool','rich','mono'));
