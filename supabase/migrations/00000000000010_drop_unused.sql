-- Columnas sin uso: popularity (catálogo; nunca se pobló ni se lee) y
-- keepalive.last_seen_at (el ping solo lee; leer ya cuenta como actividad).
-- Ejecutar DESPUÉS de desplegar el código que ya no las lee.
alter table public.chords drop column if exists popularity;
alter table public.chord_positions drop column if exists popularity;
alter table public.keepalive drop column if exists last_seen_at;
