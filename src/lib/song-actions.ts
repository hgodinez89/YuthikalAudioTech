"use server";

import { revalidatePath } from "next/cache";
import { supabaseWithSession } from "./supabase-server";
import {
  MP3_ENABLED,
  validateStamps,
  validateSyncEnd,
  type SongAudioRow,
  type SongSyncRow,
} from "./audio";
import { syncTargets } from "./chordpro";
import {
  MAX_CONTENT_LENGTH,
  normalizeInclude,
  sortInstruments,
  validateSong,
  type DuplicateInclude,
  type SongInput,
} from "./songs";

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
      instruments: sortInstruments(input.instruments),
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
  const { data, error } = await supabase
    .from("songs")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      key_note: input.keyNote,
      instruments: sortInstruments(input.instruments),
      // RLS exige que la playlist destino (si la hay) sea del mismo usuario.
      playlist_id: input.playlistId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  // Sin filas: la canción ya no existe o no es del usuario (RLS).
  if (!data?.length) return { ok: false, error: "missing" };

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
  const { data, error } = await supabase
    .from("songs")
    .update({ playlist_id: playlistId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  if (!data?.length) return { ok: false, error: "missing" };

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
  const { data, error } = await supabase
    .from("songs")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  if (!data?.length) return { ok: false, error: "missing" };

  return { ok: true };
}

/** Borra la canción (su audio y sincronización caen en cascada) y su MP3. */
export async function deleteSong(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  const { data: audio } = await supabase
    .from("song_audio")
    .select("file_path")
    .eq("song_id", id)
    .maybeSingle<{ file_path: string | null }>();

  const { data, error } = await supabase.from("songs").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: "db" };
  if (!data?.length) return { ok: false, error: "missing" };

  // Sin la fila, el archivo quedaría huérfano ocupando Storage.
  if (audio?.file_path) await supabase.storage.from("audio").remove([audio.file_path]);

  revalidateSongs();
  return { ok: true };
}

/**
 * Duplica una canción: metadatos del formulario, la letra del original y,
 * si se pide, su audio (YouTube, o el MP3 copiado como archivo propio) y su
 * sincronización. Si un paso falla tras crear la copia, se deshace todo.
 */
export async function duplicateSong(
  sourceId: string,
  input: SongInput,
  include: DuplicateInclude,
): Promise<ActionResult> {
  if (!isUuid(sourceId)) return { ok: false, error: "id" };
  const invalid = validateSong(input);
  if (invalid) return { ok: false, error: invalid };
  const want = normalizeInclude(include);

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  // RLS: solo se lee si la canción es del usuario.
  const { data: source } = await supabase
    .from("songs")
    .select(
      "content,audio:song_audio(source,youtube_id,youtube_title,file_path),sync:song_sync(granularity,stamps,targets,end_at)",
    )
    .eq("id", sourceId)
    .maybeSingle<{
      content: string;
      audio: Omit<SongAudioRow, "song_id"> | null;
      sync: (Omit<SongSyncRow, "song_id"> & { targets: string[] | null }) | null;
    }>();
  if (!source) return { ok: false, error: "id" };
  // Con la subida de MP3 deshabilitada, un MP3 no se puede copiar (ni su sincronización).
  const copyAudio =
    want.audio &&
    source.audio !== null &&
    (MP3_ENABLED || source.audio.source !== "file");

  const { data: created, error: createError } = await supabase
    .from("songs")
    .insert({
      playlist_id: input.playlistId,
      user_id: user.id,
      name: input.name.trim(),
      description: input.description.trim(),
      key_note: input.keyNote,
      instruments: sortInstruments(input.instruments),
      content: source.content,
    })
    .select("id")
    .single();
  if (createError || !created) return { ok: false, error: "db" };
  const newId = created.id as string;

  let copiedFile: string | null = null;
  const undo = async (error: string): Promise<ActionResult> => {
    // Borrar la canción arrastra su audio y su sincronización (cascada).
    await supabase.from("songs").delete().eq("id", newId);
    if (copiedFile) await supabase.storage.from("audio").remove([copiedFile]);
    return { ok: false, error };
  };

  if (copyAudio && source.audio) {
    const audio = source.audio;
    let filePath: string | null = null;
    if (audio.source === "file" && audio.file_path) {
      // Archivo propio para la copia: cambiar o borrar uno no afecta al otro.
      filePath = `${user.id}/${newId}.mp3`;
      const { error } = await supabase.storage
        .from("audio")
        .copy(audio.file_path, filePath);
      if (error) return undo("copyAudio");
      copiedFile = filePath;
    }
    const { error } = await supabase.from("song_audio").insert({
      song_id: newId,
      user_id: user.id,
      source: audio.source,
      youtube_id: audio.source === "youtube" ? audio.youtube_id : null,
      youtube_title: audio.source === "youtube" ? audio.youtube_title : null,
      file_path: filePath,
    });
    if (error) return undo("db");
  }

  const total = source.sync
    ? syncTargets(source.content, source.sync.granularity).length
    : 0;
  if (
    want.sync &&
    copyAudio &&
    source.sync &&
    validateStamps(source.sync.stamps, total)
  ) {
    const { error } = await supabase.from("song_sync").insert({
      song_id: newId,
      user_id: user.id,
      granularity: source.sync.granularity,
      stamps: source.sync.stamps,
      targets: source.sync.targets,
      end_at: validateSyncEnd(source.sync.end_at, source.sync.stamps)
        ? source.sync.end_at
        : null,
    });
    if (error) return undo("db");
  }

  revalidateSongs();
  return { ok: true, id: newId };
}
