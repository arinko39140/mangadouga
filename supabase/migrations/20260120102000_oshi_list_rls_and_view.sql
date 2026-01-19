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

create or replace view public.oshi_list_catalog as
select
  list.list_id,
  list.user_id,
  users.name,
  list.favorite_count,
  list.can_display,
  exists (
    select 1
    from public.oshi_list_favorite
    where oshi_list_favorite.target_list_id = list.list_id
      and oshi_list_favorite.user_id = auth.uid()
  ) as is_favorited
from public.list
left join public.users on users.user_id = list.user_id::text
where list.can_display = true;

revoke all on table public.oshi_list_catalog from anon;
grant select on table public.oshi_list_catalog to authenticated;
