create or replace function public.update_list_favorite_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.list
    set favorite_count = greatest(favorite_count + 1, 0)
    where list_id = new.target_list_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.list
    set favorite_count = greatest(favorite_count - 1, 0)
    where list_id = old.target_list_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists oshi_list_favorite_count_trigger on public.oshi_list_favorite;
create trigger oshi_list_favorite_count_trigger
after insert or delete on public.oshi_list_favorite
for each row
execute function public.update_list_favorite_count();
