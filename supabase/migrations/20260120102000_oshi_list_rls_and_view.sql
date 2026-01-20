create table if not exists public.oshi_list_favorite (
  user_id uuid not null default auth.uid(),
  target_list_id bigint not null references public.list (list_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_list_id)
);

alter table public.oshi_list_favorite enable row level security;

drop policy if exists "Oshi list favorite owner read" on public.oshi_list_favorite;
create policy "Oshi list favorite owner read" on public.oshi_list_favorite
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Oshi list favorite owner insert" on public.oshi_list_favorite;
create policy "Oshi list favorite owner insert" on public.oshi_list_favorite
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Oshi list favorite owner delete" on public.oshi_list_favorite;
create policy "Oshi list favorite owner delete" on public.oshi_list_favorite
for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, delete on table public.oshi_list_favorite to authenticated;
