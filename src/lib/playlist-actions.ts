"use server";

import { revalidatePath } from "next/cache";
import { supabaseWithSession } from "./supabase-server";
import { validatePlaylist, type PlaylistInput } from "./playlists";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createPlaylist(input: PlaylistInput): Promise<ActionResult> {
  // Re-validación en servidor: nunca confiar solo en el cliente.
  const invalid = validatePlaylist(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const { error } = await supabase.from("playlists").insert({
    user_id: user.id,
    name: input.name.trim(),
    description: input.description.trim(),
    genre: input.genre,
    genre_other: input.genre === "other" ? input.genreOther.trim() : null,
    rating_like: input.ratingLike,
    rating_difficulty: input.ratingDifficulty,
  });
  if (error) return { ok: false, error: "db" };

  revalidatePath("/playlists");
  return { ok: true };
}

export async function updatePlaylist(
  id: string,
  input: PlaylistInput,
): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "id" };
  const invalid = validatePlaylist(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  // RLS: solo el dueño puede actualizar.
  const { error } = await supabase
    .from("playlists")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      genre: input.genre,
      genre_other: input.genre === "other" ? input.genreOther.trim() : null,
      rating_like: input.ratingLike,
      rating_difficulty: input.ratingDifficulty,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "db" };

  revalidatePath("/playlists");
  revalidatePath(`/playlists/${id}`);
  return { ok: true };
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  // RLS garantiza que solo el dueño puede borrar su fila.
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) return { ok: false, error: "db" };

  revalidatePath("/playlists");
  return { ok: true };
}
