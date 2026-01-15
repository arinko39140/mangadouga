drop policy if exists "Public read" on public.series;
create policy "Public read" on public.series
for select
to anon, authenticated
using (true);

drop policy if exists "Public read" on public.movie;
create policy "Public read" on public.movie
for select
to anon, authenticated
using (true);

grant select on table public.series to authenticated;
grant select on table public.movie to authenticated;
