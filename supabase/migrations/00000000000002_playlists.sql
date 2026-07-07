-- Playlists privados: cada fila pertenece a su usuario (RLS de solo dueño).
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  genre text not null check (char_length(genre) between 1 and 30),
  genre_other text check (genre_other is null or char_length(genre_other) <= 50),
  rating_like smallint not null check (rating_like between 1 and 5),
  rating_difficulty smallint not null check (rating_difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlists_by_user on public.playlists (user_id, created_at desc);

alter table public.playlists enable row level security;

create policy "playlists_select_own" on public.playlists
  for select using (auth.uid() = user_id);

create policy "playlists_insert_own" on public.playlists
  for insert with check (auth.uid() = user_id);

create policy "playlists_update_own" on public.playlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "playlists_delete_own" on public.playlists
  for delete using (auth.uid() = user_id);
