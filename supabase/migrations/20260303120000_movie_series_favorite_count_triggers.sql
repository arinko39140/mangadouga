create or replace function public.recalculate_movie_favorite_count(target_movie_id uuid)
returns void
language sql
as $$
  update public.movie as m
  set favorite_count = coalesce((
    select count(*)::integer
    from public.list_movie as lm
    where lm.movie_id = target_movie_id
  ), 0)
  where m.movie_id = target_movie_id;
$$;

create or replace function public.handle_list_movie_favorite_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_movie_favorite_count(old.movie_id);
    return old;
  end if;

  perform public.recalculate_movie_favorite_count(new.movie_id);

  if tg_op = 'UPDATE' and old.movie_id is distinct from new.movie_id then
    perform public.recalculate_movie_favorite_count(old.movie_id);
  end if;

  return new;
end;
$$;

drop trigger if exists movie_favorite_count_trigger on public.list_movie;
create trigger movie_favorite_count_trigger
after insert or update or delete on public.list_movie
for each row
execute function public.handle_list_movie_favorite_count();

create or replace function public.recalculate_series_favorite_count(target_series_id text)
returns void
language sql
as $$
  update public.series as s
  set favorite_count = coalesce((
    select count(*)::integer
    from public.user_series as us
    where us.series_id = target_series_id
  ), 0)
  where s.series_id = target_series_id;
$$;

create or replace function public.handle_user_series_favorite_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_series_favorite_count(old.series_id);
    return old;
  end if;

  perform public.recalculate_series_favorite_count(new.series_id);

  if tg_op = 'UPDATE' and old.series_id is distinct from new.series_id then
    perform public.recalculate_series_favorite_count(old.series_id);
  end if;

  return new;
end;
$$;

drop trigger if exists series_favorite_count_trigger on public.user_series;
create trigger series_favorite_count_trigger
after insert or update or delete on public.user_series
for each row
execute function public.handle_user_series_favorite_count();

update public.movie as m
set favorite_count = coalesce((
  select count(*)::integer
  from public.list_movie as lm
  where lm.movie_id = m.movie_id
), 0);

update public.series as s
set favorite_count = coalesce((
  select count(*)::integer
  from public.user_series as us
  where us.series_id = s.series_id
), 0);
