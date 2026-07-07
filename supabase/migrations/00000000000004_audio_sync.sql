-- Audio vinculado a cada canción (YouTube o archivo MP3 en Storage)
create table if not exists public.song_audio (
  song_id uuid primary key references public.songs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('youtube', 'file')),
  youtube_id text check (youtube_id is null or youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  youtube_title text check (youtube_title is null or char_length(youtube_title) <= 200),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  updated_at timestamptz not null default now(),
  constraint song_audio_source_data check (
    (source = 'youtube' and youtube_id is not null)
    or (source = 'file' and file_path is not null)
  )
);

-- Sincronización: timestamps capturados contra el audio real
create table if not exists public.song_sync (
  song_id uuid primary key references public.songs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granularity text not null check (granularity in ('line', 'word')),
  stamps jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.song_audio enable row level security;
alter table public.song_sync enable row level security;

create policy "song_audio_select_own" on public.song_audio
  for select using (auth.uid() = user_id);
create policy "song_audio_insert_own" on public.song_audio
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.songs s where s.id = song_id and s.user_id = auth.uid())
  );
create policy "song_audio_update_own" on public.song_audio
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "song_audio_delete_own" on public.song_audio
  for delete using (auth.uid() = user_id);

create policy "song_sync_select_own" on public.song_sync
  for select using (auth.uid() = user_id);
create policy "song_sync_insert_own" on public.song_sync
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.songs s where s.id = song_id and s.user_id = auth.uid())
  );
create policy "song_sync_update_own" on public.song_sync
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "song_sync_delete_own" on public.song_sync
  for delete using (auth.uid() = user_id);

-- Bucket privado para los MP3, con límite de 15 MB y solo audio/mpeg.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', false, 15728640, '{audio/mpeg}')
on conflict (id) do nothing;

-- Cada usuario solo puede operar dentro de su carpeta (audio/<uid>/...).
create policy "audio_select_own" on storage.objects
  for select using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_insert_own" on storage.objects
  for insert with check (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_update_own" on storage.objects
  for update using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio_delete_own" on storage.objects
  for delete using (bucket_id = 'audio' and (storage.foldername(name))[1] = auth.uid()::text);
