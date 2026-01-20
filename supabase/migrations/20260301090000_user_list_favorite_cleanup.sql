drop trigger if exists oshi_list_favorite_count_trigger on public.oshi_list_favorite;
drop function if exists public.update_list_favorite_count();
drop table if exists public.oshi_list_favorite cascade;

drop policy if exists "User list owner insert" on public.user_list;
drop policy if exists "User list owner delete" on public.user_list;

create policy "User list owner insert" on public.user_list
for insert
to authenticated
with check (user_id = auth.uid()::text);

create policy "User list owner delete" on public.user_list
for delete
to authenticated
using (user_id = auth.uid()::text);

grant insert, delete on table public.user_list to authenticated;

create or replace function public.update_user_list_favorite_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.list
    set favorite_count = greatest(favorite_count + 1, 0)
    where list_id = new.list_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.list
    set favorite_count = greatest(favorite_count - 1, 0)
    where list_id = old.list_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists user_list_favorite_count_trigger on public.user_list;
create trigger user_list_favorite_count_trigger
after insert or delete on public.user_list
for each row
execute function public.update_user_list_favorite_count();

update public.list
set favorite_count = coalesce(sub.count, 0)
from (
  select list_id, count(*)::integer as count
  from public.user_list
  group by list_id
) as sub
where public.list.list_id = sub.list_id;

update public.list
set favorite_count = 0
where list_id not in (select list_id from public.user_list);
