create table if not exists public.series (
  series_id text primary key,
  title text not null,
  favorite_count integer not null default 0,
  "update" timestamptz not null default now()
);

alter table public.series enable row level security;

drop policy if exists "Public read" on public.series;
create policy "Public read" on public.series
for select
to anon
using (true);

grant select on table public.series to anon;
