"use server";

import { revalidatePath } from "next/cache";
import { supabaseWithSession } from "./supabase-server";
import { MAX_CONTENT_LENGTH, validateSong, type SongInput } from "./songs";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/* Las canciones se ven en /[instrument]/songs para cualquier instrumento. */
const revalidateSongs = () => revalidatePath("/[instrument]/songs", "page");

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function createSong(input: SongInput): Promise<ActionResult> {
  const invalid = validateSong(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const { data, error } = await supabase
    .from("songs")
    .insert({
      playlist_id: input.playlistId,
      user_id: user.id,
      name: input.name.trim(),
      description: input.description.trim(),
      key_note: input.keyNote,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "db" };

  revalidateSongs();
  return { ok: true, id: data.id as string };
}

export async function updateSongMeta(
  id: string,
  input: SongInput,
): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };
  const invalid = validateSong(input);
  if (invalid) return { ok: false, error: invalid };

  const supabase = await supabaseWithSession();
  const { error } = await supabase
    .from("songs")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      key_note: input.keyNote,
      // RLS exige que la playlist destino (si la hay) sea del mismo usuario.
      playlist_id: input.playlistId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: "db" };

  revalidateSongs();
  return { ok: true };
}

/** Cambia solo la playlist de una canción (null = sin playlist). */
export async function moveSongToPlaylist(
  id: string,
  playlistId: string | null,
): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };
  if (playlistId !== null && !isUuid(playlistId)) return { ok: false, error: "playlist" };

  const supabase = await supabaseWithSession();
  // RLS: la canción y la playlist destino deben ser del mismo usuario.
  const { error } = await supabase
    .from("songs")
    .update({ playlist_id: playlistId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "db" };

  revalidateSongs();
  return { ok: true };
}

export async function updateSongContent(
  id: string,
  content: string,
): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };
  if (content.length > MAX_CONTENT_LENGTH) return { ok: false, error: "content" };

  const supabase = await supabaseWithSession();
  // RLS: solo el dueño puede actualizar su canción.
  const { error } = await supabase
    .from("songs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "db" };

  return { ok: true };
}

export async function deleteSong(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) return { ok: false, error: "db" };

  revalidateSongs();
  return { ok: true };
}
