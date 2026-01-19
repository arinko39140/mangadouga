insert into public.series (series_id, title, favorite_count)
values
  ('2', '今週のサンプル', 0);

insert into public.movie (movie_title, url, favorite_count, "update", series_id, weekday)
values
  ('今週のサンプル1', 'https://example.com/movies/week-1', 0, now() - interval '1 day', '2', 'mon'),
  ('今週のサンプル2', 'https://example.com/movies/week-2', 0, now() - interval '2 days', '2', 'wed'),
  ('今週のサンプル3', 'https://example.com/movies/week-3', 0, now() - interval '3 days', '2', 'fri');
