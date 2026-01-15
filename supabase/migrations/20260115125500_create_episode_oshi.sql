create table if not exists public.episode_oshi (
  user_id uuid not null default auth.uid(),
  movie_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id),
  foreign key (movie_id) references public.movie(movie_id) on delete cascade
);

alter table public.episode_oshi enable row level security;

drop policy if exists "User read" on public.episode_oshi;
create policy "User read" on public.episode_oshi
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "User insert" on public.episode_oshi;
create policy "User insert" on public.episode_oshi
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "User delete" on public.episode_oshi;
create policy "User delete" on public.episode_oshi
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, delete on table public.episode_oshi to authenticated;
