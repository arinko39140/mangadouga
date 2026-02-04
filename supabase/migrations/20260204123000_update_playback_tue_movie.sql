update public.movie
set
  movie_title = 'Amazing Nintendo Facts',
  url = 'https://www.youtube.com/watch?v=M3r2XDceM6A',
  thumbnail_url = 'https://i.ytimg.com/vi/M3r2XDceM6A/hqdefault.jpg'
where series_id = 'series-playback-tue'
  and url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
