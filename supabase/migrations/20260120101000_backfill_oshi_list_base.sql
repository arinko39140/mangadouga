alter table if exists public.list
  add column if not exists can_display boolean not null default true;

alter table if exists public.list
  add column if not exists favorite_count integer not null default 0;

do $$
begin
  if to_regclass('public.oshi_list_favorite') is not null then
    with favorite_counts as (
      select target_list_id, count(*)::integer as count
      from public.oshi_list_favorite
      group by target_list_id
    )
    update public.list
    set favorite_count = favorite_counts.count
    from favorite_counts
    where list.list_id = favorite_counts.target_list_id;

    create index if not exists oshi_list_favorite_target_list_id_idx
      on public.oshi_list_favorite (target_list_id);
  end if;
end $$;

update public.list
set favorite_count = 0
where favorite_count is null;

create index if not exists list_favorite_count_idx
  on public.list (favorite_count);

create index if not exists list_movie_list_id_idx
  on public.list_movie (list_id);
