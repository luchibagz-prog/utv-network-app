/* VUEWE Story filters V1
   Story-only visual filters. Feed uploads remain untouched. */

alter table public.stories
  add column if not exists filter_name text not null default 'original';

update public.stories
set filter_name = 'original'
where filter_name is null or trim(filter_name) = '';
