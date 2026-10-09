-- Varios instrumentos en el catálogo + lista plana de canciones.

-- 1) Catálogo por instrumento: las filas existentes son de guitarra.
alter table public.chords
  add column if not exists instrument text not null default 'guitar'
  check (instrument in ('guitar', 'ukulele'));

drop index if exists public.chords_by_category;
drop index if exists public.chords_by_note;
create index if not exists chords_by_category
  on public.chords (instrument, category_order, note_order, name_en);
create index if not exists chords_by_note
  on public.chords (instrument, note_order, category_order, name_en);

-- 2) Lista plana: una canción puede no pertenecer a ninguna playlist, y
--    borrar una playlist conserva sus canciones.
alter table public.songs alter column playlist_id drop not null;
alter table public.songs drop constraint if exists songs_playlist_id_fkey;
alter table public.songs
  add constraint songs_playlist_id_fkey
  foreign key (playlist_id) references public.playlists (id) on delete set null;

create index if not exists songs_by_user on public.songs (user_id, created_at desc);

-- Insertar o mover una canción exige ser dueño de la playlist destino (si la hay).
drop policy if exists "songs_insert_own" on public.songs;
create policy "songs_insert_own" on public.songs
  for insert with check (
    auth.uid() = user_id
    and (
      playlist_id is null
      or exists (
        select 1 from public.playlists p
        where p.id = playlist_id and p.user_id = auth.uid()
      )
    )
  );

drop policy if exists "songs_update_own" on public.songs;
create policy "songs_update_own" on public.songs
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and (
      playlist_id is null
      or exists (
        select 1 from public.playlists p
        where p.id = playlist_id and p.user_id = auth.uid()
      )
    )
  );
