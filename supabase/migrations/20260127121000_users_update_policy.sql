alter table public.users enable row level security;

drop policy if exists "User update" on public.users;
create policy "User update" on public.users
for update
to authenticated
using (user_id = auth.uid()::text)
with check (user_id = auth.uid()::text);

grant update on table public.users to authenticated;
