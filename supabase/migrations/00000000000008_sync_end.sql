-- Fin opcional de la sincronización: el karaoke termina ahí (con un fundido)
-- en lugar de sonar hasta el final del audio. null = hasta el final.
-- Ejecutar ANTES de desplegar el código que la consulta.
alter table public.song_sync
  add column if not exists end_at real
  check (end_at is null or end_at > 0);
