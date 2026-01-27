alter table public.user_series enable row level security;

drop policy if exists "User series insert" on public.user_series;
create policy "User series insert" on public.user_series
for insert
to authenticated
with check (user_id = auth.uid()::text);

drop policy if exists "User series update" on public.user_series;
create policy "User series update" on public.user_series
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

drop policy if exists "User series delete" on public.user_series;
create policy "User series delete" on public.user_series
for delete
to authenticated
using (user_id = auth.uid()::text);

grant insert, update, delete on table public.user_series to authenticated;
