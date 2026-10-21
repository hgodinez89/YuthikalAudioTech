-- Biblioteca personal de acordes: los que no están en el catálogo (o una
-- digitación propia). Privados por usuario; tienen prioridad sobre el
-- catálogo al mostrar sus canciones en ese instrumento.

-- ¿Todos los valores del arreglo están en [lo, hi]? (inmutable: sirve en un check)
create or replace function public.all_between(vals smallint[], lo integer, hi integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(v between lo and hi), true) from unnest(vals) as v;
$$;

create table if not exists public.custom_chords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  instrument text not null check (instrument in ('guitar', 'ukulele', 'piano')),
  -- El nombre tal como va en el cifrado ("Cadd9", "C/E"): sin espacios.
  name text not null check (name ~ '^\S{1,24}$'),
  -- Guitarra/ukelele: traste inicial, un valor por cuerda (de la más grave a
  -- la 1ª; -1 muteada, 0 al aire, 1–5 relativo a base_fret) y cejillas.
  base_fret smallint not null default 1 check (base_fret between 1 and 20),
  frets smallint[] not null default '{}' check (public.all_between(frets, -1, 5)),
  barres smallint[] not null default '{}'
    check (cardinality(barres) <= 2 and public.all_between(barres, 1, 5)),
  -- Piano: teclas MIDI del acorde (de La0 a Do8).
  keys smallint[] not null default '{}' check (public.all_between(keys, 21, 108)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, instrument, name),
  check (
    case instrument
      when 'guitar' then cardinality(frets) = 6 and cardinality(keys) = 0
      when 'ukulele' then cardinality(frets) = 4 and cardinality(keys) = 0
      else cardinality(frets) = 0 and cardinality(barres) = 0
        and cardinality(keys) between 3 and 6
    end
  )
);

alter table public.custom_chords enable row level security;

create policy "custom_chords_select_own" on public.custom_chords
  for select using ((select auth.uid()) = user_id);
create policy "custom_chords_insert_own" on public.custom_chords
  for insert with check ((select auth.uid()) = user_id);
create policy "custom_chords_update_own" on public.custom_chords
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "custom_chords_delete_own" on public.custom_chords
  for delete using ((select auth.uid()) = user_id);
