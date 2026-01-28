create or replace function public.update_movie_favorite_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.movie
    set favorite_count = greatest(favorite_count + 1, 0)
    where movie_id = new.movie_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.movie
    set favorite_count = greatest(favorite_count - 1, 0)
    where movie_id = old.movie_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists movie_favorite_count_trigger on public.list_movie;
create trigger movie_favorite_count_trigger
after insert or delete on public.list_movie
for each row
execute function public.update_movie_favorite_count();

update public.movie
set favorite_count = coalesce(sub.count, 0)
from (
  select movie_id, count(*)::integer as count
  from public.list_movie
  group by movie_id
) as sub
where public.movie.movie_id = sub.movie_id;

update public.movie
set favorite_count = 0
where movie_id not in (select movie_id from public.list_movie);
