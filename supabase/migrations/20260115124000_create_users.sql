create table if not exists public.users (
  user_id text primary key,
  name text not null,
  x_url text,
  youtube_url text,
  other_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Public read" on public.users;
create policy "Public read" on public.users
for select
to anon, authenticated
using (true);

grant select on table public.users to anon, authenticated;
