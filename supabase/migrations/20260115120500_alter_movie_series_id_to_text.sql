alter table public.movie
  alter column series_id type text using series_id::text;
