begin;

-- 同一ユーザー・同一作品の重複を最新1件に整理
with ranked as (
  select
    history_id,
    row_number() over (
      partition by user_id, movie_id
      order by clicked_at desc, history_id desc
    ) as rn
  from public.history
)
delete from public.history h
using ranked r
where h.history_id = r.history_id
  and r.rn > 1;

-- 同一ユーザー・同一作品は最新1件のみ保持
create unique index if not exists history_user_movie_unique_idx
  on public.history (user_id, movie_id);

commit;
