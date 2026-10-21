"use server";

import { revalidateSongList } from "./revalidate";
import { isUuid } from "./ids";
import { sessionUserId, supabaseWithSession } from "./supabase-server";
import { validatePlaylist, type PlaylistInput } from "./playlists";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createPlaylist(input: PlaylistInput): Promise<ActionResult> {
  // Re-validación en servidor: nunca confiar solo en el cliente.
  const invalid = validatePlaylist(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: userId,
      name: input.name.trim(),
      description: input.description.trim(),
      genre: input.genre,
      genre_other: input.genre === "other" ? input.genreOther.trim() : null,
      rating_like: input.ratingLike,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "db" };

  revalidateSongList();
  return { ok: true, id: data.id as string };
}

export async function updatePlaylist(
  id: string,
  input: PlaylistInput,
): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };
  const invalid = validatePlaylist(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  // RLS: solo el dueño puede actualizar.
  const { data, error } = await supabase
    .from("playlists")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      genre: input.genre,
      genre_other: input.genre === "other" ? input.genreOther.trim() : null,
      rating_like: input.ratingLike,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  // Sin filas: la playlist ya no existe o no es del usuario (RLS).
  if (!data?.length) return { ok: false, error: "missing" };

  revalidateSongList();
  return { ok: true };
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  // RLS garantiza que solo el dueño puede borrar su fila; sus canciones se
  // conservan sin playlist (FK on delete set null).
  const { data, error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  if (!data?.length) return { ok: false, error: "missing" };

  revalidateSongList();
  return { ok: true };
}

/* Tope de canciones por setlist al reordenar (la base admite hasta 100 000). */
const MAX_SETLIST = 500;

/**
 * Guarda el orden del setlist de una playlist: `songIds` en el orden nuevo.
 * Una sola llamada (función `reorder_playlist`, con RLS del usuario); si alguna
 * canción no es suya o ya no está en esa playlist, no cuenta y se avisa.
 */
export async function reorderPlaylist(
  playlistId: string,
  songIds: string[],
): Promise<ActionResult> {
  if (!isUuid(playlistId)) return { ok: false, error: "id" };
  if (
    !Array.isArray(songIds) ||
    songIds.length === 0 ||
    songIds.length > MAX_SETLIST ||
    !songIds.every(isUuid) ||
    new Set(songIds).size !== songIds.length
  ) {
    return { ok: false, error: "id" };
  }

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };

  const { data, error } = await supabase.rpc("reorder_playlist", {
    p_playlist: playlistId,
    p_songs: songIds,
  });
  if (error) return { ok: false, error: "db" };
  if (data !== songIds.length) return { ok: false, error: "missing" };

  revalidateSongList();
  return { ok: true };
}
