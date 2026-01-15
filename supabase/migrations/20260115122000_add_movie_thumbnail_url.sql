alter table public.movie
  add column if not exists thumbnail_url text;
