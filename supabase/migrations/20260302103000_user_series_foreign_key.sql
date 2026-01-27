alter table public.user_series
add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and tc.table_name = 'user_series'
      and tc.constraint_name = 'user_series_series_id_fkey'
  ) then
    alter table public.user_series
      add constraint user_series_series_id_fkey
      foreign key (series_id) references public.series(series_id)
      on delete cascade;
  end if;
end $$;
