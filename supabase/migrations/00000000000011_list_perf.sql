-- Rendimiento. Ejecutar ANTES de desplegar el código que lee stamp_count.
--
-- 1) "Mis canciones" solo necesita cuántas marcas tiene cada sincronización:
--    la BD lo calcula al guardar y la lista ya no descarga el arreglo completo.
alter table public.song_sync
  add column if not exists stamp_count integer
  generated always as (jsonb_array_length(stamps)) stored;

-- 2) Búsqueda de texto del buscador (ilike '%…%'): índice trigram.
create extension if not exists pg_trgm with schema extensions;
create index if not exists chords_search_trgm
  on public.chords using gin (search_text extensions.gin_trgm_ops);
