alter table public.users
  add column if not exists icon_url text,
  add column if not exists x_label text,
  add column if not exists youtube_label text,
  add column if not exists other_label text;
