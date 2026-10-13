-- La dificultad de las playlists deja de usarse (solo queda "Me gusta").
-- Ejecutar DESPUÉS de desplegar el código que ya no la lee ni la escribe.
alter table public.playlists drop column if exists rating_difficulty;
