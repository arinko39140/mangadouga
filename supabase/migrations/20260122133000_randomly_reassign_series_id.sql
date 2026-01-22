update public.movie
set series_id = 's-7f3b2'
where movie_id in (
  select movie_id
  from public.movie
  where series_id = '1'
  order by random()
  limit 6
);
