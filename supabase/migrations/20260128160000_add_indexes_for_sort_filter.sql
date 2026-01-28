create index if not exists movie_update_idx
  on public.movie ("update");

create index if not exists movie_weekday_idx
  on public.movie (weekday);

create index if not exists movie_favorite_count_idx
  on public.movie (favorite_count);

create index if not exists list_favorite_count_idx
  on public.list (favorite_count);
