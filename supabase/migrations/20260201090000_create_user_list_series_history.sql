create table if not exists public.user_list (
  user_id text not null,
  list_id bigint not null,
  can_display boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, list_id)
);

create table if not exists public.user_series (
  user_id text not null,
  series_id text not null,
  can_display boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

create table if not exists public.history (
  history_id bigint primary key,
  user_id text not null,
  movie_id text not null,
  clicked_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.user_list enable row level security;
alter table public.user_series enable row level security;
alter table public.history enable row level security;

drop policy if exists "Public read" on public.user_list;
create policy "Public read" on public.user_list
for select
to anon, authenticated
using (true);

drop policy if exists "Public read" on public.user_series;
create policy "Public read" on public.user_series
for select
to anon, authenticated
using (true);

drop policy if exists "Public read" on public.history;
create policy "Public read" on public.history
for select
to anon, authenticated
using (true);

grant select on table public.user_list to anon, authenticated;
grant select on table public.user_series to anon, authenticated;
grant select on table public.history to anon, authenticated;
