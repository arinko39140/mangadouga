insert into public.series (series_id, title, favorite_count)
values ('1', 'あいうえお', 0)
on conflict do nothing;

update public.movie
set series_id = '1'
where series_id is null;
