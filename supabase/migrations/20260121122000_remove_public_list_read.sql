-- Remove public (anon) read access for lists

drop policy if exists "Public list read" on public.list;
drop policy if exists "Public list movie read" on public.list_movie;

revoke select on table public.list from anon;
revoke select on table public.list_movie from anon;
