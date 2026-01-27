insert into storage.buckets (id, name, public)
values ('user-icons', 'user-icons', true)
on conflict (id) do nothing;

drop policy if exists "Public read user icons" on storage.objects;
drop policy if exists "Authenticated upload user icons" on storage.objects;
drop policy if exists "Authenticated update user icons" on storage.objects;
drop policy if exists "Authenticated delete user icons" on storage.objects;

create policy "Public read user icons" on storage.objects
for select
using (bucket_id = 'user-icons');

create policy "Authenticated upload user icons" on storage.objects
for insert
to authenticated
with check (bucket_id = 'user-icons');

create policy "Authenticated update user icons" on storage.objects
for update
to authenticated
using (bucket_id = 'user-icons')
with check (bucket_id = 'user-icons');

create policy "Authenticated delete user icons" on storage.objects
for delete
to authenticated
using (bucket_id = 'user-icons');
