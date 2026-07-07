-- Canciones: letra + acordes en formato ChordPro, privadas por usuario.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  description text not null default '' check (char_length(description) <= 300),
  key_note text not null default '' check (char_length(key_note) <= 10),
  content text not null default '' check (char_length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_by_playlist on public.songs (playlist_id, created_at);

alter table public.songs enable row level security;

create policy "songs_select_own" on public.songs
  for select using (auth.uid() = user_id);

-- Insertar exige además ser dueño del playlist destino.
create policy "songs_insert_own" on public.songs
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

create policy "songs_update_own" on public.songs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "songs_delete_own" on public.songs
  for delete using (auth.uid() = user_id);
