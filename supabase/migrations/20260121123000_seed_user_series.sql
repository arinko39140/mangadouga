insert into public.user_series (user_id, series_id, can_display)
values
  ('1', '1', true)
on conflict (user_id, series_id) do nothing;
