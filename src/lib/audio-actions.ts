"use server";

import { revalidatePath } from "next/cache";
import {
  MP3_ENABLED,
  validateStamps,
  validateSyncEnd,
  type SongAudioRow,
  type SyncStamp,
} from "./audio";
import { syncTargets } from "./chordpro";
import { isUuid } from "./ids";
import { sessionUserId, supabaseWithSession } from "./supabase-server";
import { parseYouTubeId } from "./youtube";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Título vía oEmbed (en servidor: sin restricciones de CSP del navegador). */
async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    return typeof data.title === "string" ? data.title.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/**
 * Conecta un video de YouTube. Si reemplaza otro audio, la sincronización
 * anterior se borra (sus tiempos eran de otra grabación) y el MP3 previo, si
 * lo había, se elimina de Storage.
 */
export async function setYouTubeAudio(
  songId: string,
  url: string,
): Promise<ActionResult> {
  if (!isUuid(songId)) return { ok: false, error: "id" };
  const videoId = parseYouTubeId(url);
  if (!videoId) return { ok: false, error: "url" };

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };

  const { data: previous } = await supabase
    .from("song_audio")
    .select("source,youtube_id,file_path")
    .eq("song_id", songId)
    .maybeSingle<Pick<SongAudioRow, "source" | "youtube_id" | "file_path">>();

  const title = await fetchYouTubeTitle(videoId);
  const { error } = await supabase.from("song_audio").upsert({
    song_id: songId,
    user_id: userId,
    source: "youtube",
    youtube_id: videoId,
    youtube_title: title,
    file_path: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  const changed =
    previous && (previous.source !== "youtube" || previous.youtube_id !== videoId);
  if (changed) {
    await supabase.from("song_sync").delete().eq("song_id", songId);
    if (previous.file_path) {
      await supabase.storage.from("audio").remove([previous.file_path]);
    }
  }

  revalidatePath("/[locale]/[instrument]/songs", "page");
  return { ok: true };
}

/** Registra el MP3 ya subido a Storage (la subida la hace el cliente con RLS). */
export async function setFileAudio(
  songId: string,
  filePath: string,
): Promise<ActionResult> {
  if (!MP3_ENABLED) return { ok: false, error: "mp3Disabled" };
  if (!isUuid(songId)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };
  // Un archivo por canción, en la carpeta del usuario.
  if (filePath !== `${userId}/${songId}.mp3`) return { ok: false, error: "path" };

  const { error } = await supabase.from("song_audio").upsert({
    song_id: songId,
    user_id: userId,
    source: "file",
    youtube_id: null,
    youtube_title: null,
    file_path: filePath,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  revalidatePath("/[locale]/[instrument]/songs", "page");
  return { ok: true };
}

/**
 * Guarda las marcas validadas contra la letra actual de la canción (leída de
 * la BD, no del cliente) junto con su huella, para poder reubicarlas si la
 * letra cambia después.
 */
export async function saveSync(
  songId: string,
  granularity: "line" | "word",
  stamps: SyncStamp[],
  endAt: number | null,
): Promise<ActionResult> {
  if (!isUuid(songId)) return { ok: false, error: "id" };
  if (granularity !== "line" && granularity !== "word") {
    return { ok: false, error: "granularity" };
  }

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };

  // RLS: solo se lee si la canción es del usuario.
  const { data: song } = await supabase
    .from("songs")
    .select("content")
    .eq("id", songId)
    .maybeSingle<{ content: string }>();
  if (!song) return { ok: false, error: "id" };

  const targets = syncTargets(song.content, granularity);
  if (!validateStamps(stamps, targets.length)) return { ok: false, error: "stamps" };
  if (!validateSyncEnd(endAt, stamps)) return { ok: false, error: "end" };

  const { error } = await supabase.from("song_sync").upsert({
    song_id: songId,
    user_id: userId,
    granularity,
    stamps,
    targets,
    end_at: endAt,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  return { ok: true };
}
