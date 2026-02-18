create or replace function public.sync_movie_favorite_count(target_movie_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer := 0;
begin
  update public.movie as m
  set favorite_count = coalesce((
    select count(*)::integer
    from public.list_movie as lm
    where lm.movie_id = target_movie_id
  ), 0)
  where m.movie_id = target_movie_id
  returning m.favorite_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

revoke all on function public.sync_movie_favorite_count(uuid) from public;
grant execute on function public.sync_movie_favorite_count(uuid) to authenticated;

create or replace function public.sync_series_favorite_count(target_series_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer := 0;
begin
  update public.series as s
  set favorite_count = coalesce((
    select count(*)::integer
    from public.user_series as us
    where us.series_id = target_series_id
  ), 0)
  where s.series_id = target_series_id
  returning s.favorite_count into next_count;

  return coalesce(next_count, 0);
end;
$$;

revoke all on function public.sync_series_favorite_count(text) from public;
grant execute on function public.sync_series_favorite_count(text) to authenticated;
