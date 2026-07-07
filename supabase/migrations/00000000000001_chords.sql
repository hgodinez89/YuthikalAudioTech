-- Catálogo público de acordes (generado desde @tombatossals/chords-db).
create table if not exists public.chords (
  id text primary key,
  key text not null,
  suffix text not null,
  name_en text not null,
  name_es text not null,
  category text not null,
  category_order smallint not null,
  note_order smallint not null,
  notes text[] not null,
  intervals text[] not null,
  positions_count smallint not null,
  search_text text not null,
  popularity smallint
);

create table if not exists public.chord_positions (
  id bigint generated always as identity primary key,
  chord_id text not null references public.chords (id) on delete cascade,
  position smallint not null,
  base_fret smallint not null,
  frets smallint[] not null,
  fingers smallint[] not null,
  barres smallint[] not null,
  capo boolean not null default false,
  popularity smallint,
  unique (chord_id, position)
);

create index if not exists chords_by_category on public.chords (category_order, note_order, name_en);
create index if not exists chords_by_note on public.chords (note_order, category_order, name_en);
create index if not exists chord_positions_by_chord on public.chord_positions (chord_id, position);

alter table public.chords enable row level security;
alter table public.chord_positions enable row level security;

-- Catálogo de solo lectura pública; nadie escribe desde el cliente.
create policy "chords_public_read" on public.chords for select using (true);
create policy "chord_positions_public_read" on public.chord_positions for select using (true);
