begin;

-- history: user_id + clicked_at 降順の取得を最適化
create index if not exists history_user_clicked_idx
  on public.history (user_id, clicked_at desc);

-- users 登録時にデフォルトの list を自動作成する
create or replace function public.ensure_default_list_for_user()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.list (user_id)
  select new.user_id::uuid
  where not exists (
    select 1
    from public.list
    where user_id = new.user_id::uuid
  );

  return new;
exception
  when invalid_text_representation then
    return new;
end;
$$;

drop trigger if exists default_list_insert_trigger on public.users;
create trigger default_list_insert_trigger
after insert on public.users
for each row
execute function public.ensure_default_list_for_user();

commit;
