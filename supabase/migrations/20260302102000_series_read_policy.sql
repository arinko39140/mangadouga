alter table public.series enable row level security;

drop policy if exists "Public read" on public.series;
create policy "Public read" on public.series
for select
to anon, authenticated
using (true);

grant select on table public.series to anon, authenticated;

alter table public.user_series enable row level security;

drop policy if exists "Public read" on public.user_series;
create policy "Public read" on public.user_series
for select
to anon, authenticated
using (true);

grant select on table public.user_series to anon, authenticated;
