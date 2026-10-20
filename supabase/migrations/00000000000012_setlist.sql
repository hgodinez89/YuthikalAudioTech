-- Setlist: orden explícito de las canciones dentro de su playlist (modo
-- concierto). Sin posición (canciones nuevas o recién movidas) van al final,
-- por fecha de creación.
alter table public.songs
  add column if not exists playlist_position integer
  check (playlist_position is null or playlist_position between 0 and 100000);

create index if not exists songs_by_playlist_position
  on public.songs (playlist_id, playlist_position);

-- Reordenar una playlist en una sola llamada. security invoker: corre con los
-- permisos del usuario, así RLS limita el update a sus propias canciones.
create or replace function public.reorder_playlist(p_playlist uuid, p_songs uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.songs s
    set playlist_position = o.ord - 1
    from unnest(p_songs) with ordinality as o(id, ord)
    where s.id = o.id and s.playlist_id = p_playlist
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.reorder_playlist(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_playlist(uuid, uuid[]) to authenticated;
