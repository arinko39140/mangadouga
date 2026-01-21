-- Public read access for shared lists

drop policy if exists "Public list read" on public.list;
create policy "Public list read" on public.list
for select
to anon
using (can_display = true);

drop policy if exists "Public list movie read" on public.list_movie;
create policy "Public list movie read" on public.list_movie
for select
to anon
using (
  exists (
    select 1
    from public.list
    where list.list_id = list_movie.list_id
      and list.can_display = true
  )
);

grant select on table public.list to anon;
grant select on table public.list_movie to anon;
