alter table if exists public.list
  add column if not exists can_display boolean not null default true;

alter table if exists public.list
  add column if not exists favorite_count integer not null default 0;

update public.list
set favorite_count = 0
where favorite_count is null;

create index if not exists list_favorite_count_idx
  on public.list (favorite_count);

create index if not exists list_movie_list_id_idx
  on public.list_movie (list_id);
