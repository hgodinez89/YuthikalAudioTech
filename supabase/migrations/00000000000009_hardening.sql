-- Endurecimiento previo al lanzamiento. Ejecutar ANTES de desplegar el código
-- que guarda la huella de la sincronización (song_sync.targets).
--
-- 1) RLS con (select auth.uid()): Postgres lo evalúa una vez por consulta y no
--    por fila (regla auth_rls_initplan del linter de Supabase).
-- 2) song_audio / song_sync: actualizar exige que la canción (también la de
--    destino) sea del usuario; antes solo se revisaba user_id.
-- 3) Límites también en la BD (no solo en las server actions).
-- 4) Subida de MP3 deshabilitada: sin políticas de insert/update en el bucket
--    `audio`, nadie puede subir ni reemplazar archivos. Leer y borrar siguen.

-- Playlists ----------------------------------------------------------------
drop policy if exists "playlists_select_own" on public.playlists;
drop policy if exists "playlists_insert_own" on public.playlists;
drop policy if exists "playlists_update_own" on public.playlists;
drop policy if exists "playlists_delete_own" on public.playlists;

create policy "playlists_select_own" on public.playlists
  for select using ((select auth.uid()) = user_id);
create policy "playlists_insert_own" on public.playlists
  for insert with check ((select auth.uid()) = user_id);
create policy "playlists_update_own" on public.playlists
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "playlists_delete_own" on public.playlists
  for delete using ((select auth.uid()) = user_id);

-- Canciones ----------------------------------------------------------------
drop policy if exists "songs_select_own" on public.songs;
drop policy if exists "songs_insert_own" on public.songs;
drop policy if exists "songs_update_own" on public.songs;
drop policy if exists "songs_delete_own" on public.songs;

create policy "songs_select_own" on public.songs
  for select using ((select auth.uid()) = user_id);
-- Insertar o mover exige ser dueño de la playlist destino (si la hay).
create policy "songs_insert_own" on public.songs
  for insert with check (
    (select auth.uid()) = user_id
    and (
      playlist_id is null
      or exists (
        select 1 from public.playlists p
        where p.id = playlist_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy "songs_update_own" on public.songs
  for update using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and (
      playlist_id is null
      or exists (
        select 1 from public.playlists p
        where p.id = playlist_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy "songs_delete_own" on public.songs
  for delete using ((select auth.uid()) = user_id);

-- Audio de la canción ------------------------------------------------------
drop policy if exists "song_audio_select_own" on public.song_audio;
drop policy if exists "song_audio_insert_own" on public.song_audio;
drop policy if exists "song_audio_update_own" on public.song_audio;
drop policy if exists "song_audio_delete_own" on public.song_audio;

create policy "song_audio_select_own" on public.song_audio
  for select using ((select auth.uid()) = user_id);
create policy "song_audio_insert_own" on public.song_audio
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = (select auth.uid())
    )
  );
create policy "song_audio_update_own" on public.song_audio
  for update using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = (select auth.uid())
    )
  );
create policy "song_audio_delete_own" on public.song_audio
  for delete using ((select auth.uid()) = user_id);

-- Sincronización -----------------------------------------------------------
drop policy if exists "song_sync_select_own" on public.song_sync;
drop policy if exists "song_sync_insert_own" on public.song_sync;
drop policy if exists "song_sync_update_own" on public.song_sync;
drop policy if exists "song_sync_delete_own" on public.song_sync;

create policy "song_sync_select_own" on public.song_sync
  for select using ((select auth.uid()) = user_id);
create policy "song_sync_insert_own" on public.song_sync
  for insert with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = (select auth.uid())
    )
  );
create policy "song_sync_update_own" on public.song_sync
  for update using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.user_id = (select auth.uid())
    )
  );
create policy "song_sync_delete_own" on public.song_sync
  for delete using ((select auth.uid()) = user_id);

-- Límites en la BD -----------------------------------------------------------
-- `not valid`: se exigen a toda fila nueva o modificada sin revisar las
-- existentes, así la migración nunca falla por datos anteriores.
-- Huella de la letra al sincronizar: el texto de cada objetivo (línea o palabra).
alter table public.song_sync
  add column if not exists targets text[];

alter table public.song_sync drop constraint if exists song_sync_stamps_shape;
alter table public.song_sync
  add constraint song_sync_stamps_shape check (
    jsonb_typeof(stamps) = 'array' and jsonb_array_length(stamps) <= 10000
  ) not valid;
alter table public.song_sync drop constraint if exists song_sync_targets_size;
alter table public.song_sync
  add constraint song_sync_targets_size check (
    targets is null or cardinality(targets) <= 10000
  ) not valid;
-- Fin opcional: positivo (ya existente) y como máximo 24 h.
alter table public.song_sync drop constraint if exists song_sync_end_range;
alter table public.song_sync
  add constraint song_sync_end_range check (end_at is null or end_at <= 86400) not valid;

-- El MP3 vive siempre en la carpeta de su dueño.
alter table public.song_audio drop constraint if exists song_audio_file_owner;
alter table public.song_audio
  add constraint song_audio_file_owner check (
    file_path is null or file_path like user_id::text || '/%'
  ) not valid;

-- Storage: MP3 de solo lectura/borrado ---------------------------------------
drop policy if exists "audio_select_own" on storage.objects;
drop policy if exists "audio_insert_own" on storage.objects;
drop policy if exists "audio_update_own" on storage.objects;
drop policy if exists "audio_delete_own" on storage.objects;

create policy "audio_select_own" on storage.objects
  for select using (
    bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "audio_delete_own" on storage.objects
  for delete using (
    bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- Para reactivar la subida de MP3: volver a crear audio_insert_own y
-- audio_update_own (ver docs/IMPLEMENTATION.md) y poner MP3_ENABLED = true.
