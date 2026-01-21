insert into public.user_series (user_id, series_id, can_display)
select u.user_id, s.series_id, true
from public.users u
cross join public.series s
order by random()
limit 20
on conflict (user_id, series_id) do nothing;
