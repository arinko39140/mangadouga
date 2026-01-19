alter table if exists public.episode_oshi rename to movie_oshi;

alter table public.movie_oshi enable row level security;

drop policy if exists "User read" on public.movie_oshi;
create policy "User read" on public.movie_oshi
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "User insert" on public.movie_oshi;
create policy "User insert" on public.movie_oshi
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "User delete" on public.movie_oshi;
create policy "User delete" on public.movie_oshi
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, delete on table public.movie_oshi to authenticated;
