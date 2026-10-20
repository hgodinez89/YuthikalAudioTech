"use server";

import { revalidatePath } from "next/cache";
import { isUuid } from "./ids";
import { supabaseWithSession } from "./supabase-server";
import { validatePlaylist, type PlaylistInput } from "./playlists";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/* Las playlists son filtros de la lista de canciones de cada instrumento. */
const revalidateSongs = () => revalidatePath("/[instrument]/songs", "page");

export async function createPlaylist(input: PlaylistInput): Promise<ActionResult> {
  // Re-validación en servidor: nunca confiar solo en el cliente.
  const invalid = validatePlaylist(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      user_id: user.id,
      name: input.name.trim(),
      description: input.description.trim(),
      genre: input.genre,
      genre_other: input.genre === "other" ? input.genreOther.trim() : null,
      rating_like: input.ratingLike,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "db" };

  revalidateSongs();
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

  revalidateSongs();
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

  revalidateSongs();
  return { ok: true };
}
