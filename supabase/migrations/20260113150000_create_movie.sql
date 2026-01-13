drop table if exists public.movies;

create table if not exists public.movie (
  movie_id uuid primary key default gen_random_uuid(),
  movie_title text not null,
  url text,
  favorite_count integer not null default 0,
  "update" timestamptz not null default now(),
  series_id uuid,
  weekday text not null
);

alter table public.movie enable row level security;

drop policy if exists "Public read" on public.movie;
create policy "Public read" on public.movie
for select
to anon
using (true);

grant select on table public.movie to anon;
