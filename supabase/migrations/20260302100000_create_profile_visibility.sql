create table if not exists public.profile_visibility (
  user_id text primary key references public.users(user_id) on delete cascade,
  oshi_list_visibility text not null default 'private',
  oshi_series_visibility text not null default 'private',
  updated_at timestamptz not null default now(),
  check (oshi_list_visibility in ('public','private')),
  check (oshi_series_visibility in ('public','private'))
);

alter table public.profile_visibility enable row level security;

drop policy if exists "Profile visibility read" on public.profile_visibility;
create policy "Profile visibility read" on public.profile_visibility
for select
to anon, authenticated
using (true);

drop policy if exists "Profile visibility insert" on public.profile_visibility;
create policy "Profile visibility insert" on public.profile_visibility
for insert
to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "Profile visibility update" on public.profile_visibility;
create policy "Profile visibility update" on public.profile_visibility
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

grant select on table public.profile_visibility to anon, authenticated;
grant insert, update on table public.profile_visibility to authenticated;

insert into public.profile_visibility (user_id, oshi_list_visibility, oshi_series_visibility)
select
  users.user_id,
  case
    when exists (
      select 1
      from public.list
      where list.user_id::text = users.user_id
        and list.can_display = true
    ) then 'public'
    else 'private'
  end as oshi_list_visibility,
  case
    when exists (
      select 1
      from public.user_series
      where user_series.user_id = users.user_id
        and user_series.can_display = true
    ) then 'public'
    else 'private'
  end as oshi_series_visibility
from public.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user_profile_visibility()
returns trigger
language plpgsql
as $$
begin
  insert into public.profile_visibility (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profile_visibility_insert_trigger on public.users;
create trigger profile_visibility_insert_trigger
after insert on public.users
for each row
execute function public.handle_new_user_profile_visibility();
