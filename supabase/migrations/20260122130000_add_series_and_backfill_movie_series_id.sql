insert into public.series (series_id, title, favorite_count)
values ('s-7f3b2', '月影のアトリエ', 0)
on conflict do nothing;

update public.movie
set series_id = 's-7f3b2'
where series_id is null;
