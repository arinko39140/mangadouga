create table if not exists public.series_favorite (
  user_id uuid not null default auth.uid(),
  series_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id),
  foreign key (series_id) references public.series(series_id) on delete cascade
);

alter table public.series_favorite enable row level security;

drop policy if exists "User read" on public.series_favorite;
create policy "User read" on public.series_favorite
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "User insert" on public.series_favorite;
create policy "User insert" on public.series_favorite
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "User delete" on public.series_favorite;
create policy "User delete" on public.series_favorite
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, delete on table public.series_favorite to authenticated;
