begin;

alter table public.history enable row level security;

drop policy if exists "History update" on public.history;
create policy "History update" on public.history
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant update on table public.history to authenticated;

commit;
