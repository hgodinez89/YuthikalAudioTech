-- Instrumentos para los que está preparada cada canción (dato informativo:
-- no filtra la lista). '{}' = sin definir. Las RLS de songs ya cubren la columna.
alter table public.songs
  add column if not exists instruments text[] not null default '{}'
  check (instruments <@ array['guitar', 'ukulele', 'piano']::text[]);
