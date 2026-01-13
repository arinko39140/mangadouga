create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.movies enable row level security;

drop policy if exists "Public read" on public.movies;
drop policy if exists "Public insert" on public.movies;
drop policy if exists "Public update" on public.movies;
drop policy if exists "Public delete" on public.movies;

create policy "Public read" on public.movies
for select
to anon
using (true);

create policy "Public insert" on public.movies
for insert
to anon
with check (true);

create policy "Public update" on public.movies
for update
to anon
using (true)
with check (true);

create policy "Public delete" on public.movies
for delete
to anon
using (true);

grant select, insert, update, delete on table public.movies to anon;
