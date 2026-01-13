create table if not exists public.users_temp (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.users_temp (id, name)
values ('id1', 'サンプルユーザー');
