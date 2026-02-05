insert into public.series (series_id, title, favorite_count)
values
  ('1', 'あいうえお', 100)
on conflict do nothing;

insert into public.users (user_id, name, x_url, youtube_url, other_url)
values
  ('1', 'A', null, null, null)
on conflict do nothing;

insert into public.movie (movie_title, url, favorite_count, "update", series_id, weekday)
values
  ('朝焼けのスケッチ', 'https://example.com/movies/1', 120, now() - interval '1 day', '1', 'mon'),
  ('月曜のレター', 'https://example.com/movies/2', 80, now() - interval '2 days', '1', 'mon'),
  ('火のしおり', 'https://example.com/movies/3', 140, now() - interval '1 day', '1', 'tue'),
  ('火曜の午後', 'https://example.com/movies/4', 90, now() - interval '3 days', '1', 'tue'),
  ('水面の記憶', 'https://example.com/movies/5', 130, now() - interval '2 days', '1', 'wed'),
  ('水曜の旅人', 'https://example.com/movies/6', 70, now() - interval '4 days', '1', 'wed'),
  ('木漏れ日の地図', 'https://example.com/movies/7', 150, now() - interval '1 day', '1', 'thu'),
  ('木曜の約束', 'https://example.com/movies/8', 95, now() - interval '5 days', '1', 'thu'),
  ('金色のリズム', 'https://example.com/movies/9', 160, now() - interval '1 day', '1', 'fri'),
  ('金曜のプラットフォーム', 'https://example.com/movies/10', 85, now() - interval '6 days', '1', 'fri'),
  ('土曜のトーン', 'https://example.com/movies/11', 110, now() - interval '2 days', '1', 'sat'),
  ('星砂の午後', 'https://example.com/movies/12', 75, now() - interval '6 days', '1', 'sat'),
  ('日曜のバルコニー', 'https://example.com/movies/13', 125, now() - interval '3 days', '1', 'sun'),
  ('日曜日のサイン', 'https://example.com/movies/14', 60, now() - interval '5 days', '1', 'sun');

insert into public.user_list (user_id, list_id)
values
  ('1', 2),
  ('1', 3)
on conflict do nothing;

insert into public.user_series (user_id, series_id)
values
  ('1', '1')
on conflict do nothing;

insert into public.history (user_id, movie_id, clicked_at)
select
  gen_random_uuid(),
  movie_id,
  to_timestamp('2025/1/8/12:12', 'YYYY/MM/DD/HH24:MI')
from public.movie
limit 1
on conflict do nothing;
