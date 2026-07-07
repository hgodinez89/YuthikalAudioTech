"use server";

import { revalidatePath } from "next/cache";
import { validateStamps, type SyncStamp } from "./audio";
import { supabaseWithSession } from "./supabase-server";
import { parseYouTubeId } from "./youtube";

type ActionResult = { ok: true } | { ok: false; error: string };

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

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

export async function setYouTubeAudio(
  songId: string,
  url: string,
): Promise<ActionResult> {
  if (!isUuid(songId)) return { ok: false, error: "id" };
  const videoId = parseYouTubeId(url);
  if (!videoId) return { ok: false, error: "url" };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const title = await fetchYouTubeTitle(videoId);
  const { error } = await supabase.from("song_audio").upsert({
    song_id: songId,
    user_id: user.id,
    source: "youtube",
    youtube_id: videoId,
    youtube_title: title,
    file_path: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  revalidatePath(`/playlists`);
  return { ok: true };
}

/** Registra el MP3 ya subido a Storage (la subida la hace el cliente con RLS). */
export async function setFileAudio(
  songId: string,
  filePath: string,
): Promise<ActionResult> {
  if (!isUuid(songId)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };
  // La ruta debe vivir en la carpeta del usuario y ser un mp3.
  if (!filePath.startsWith(`${user.id}/`) || !filePath.endsWith(".mp3")) {
    return { ok: false, error: "path" };
  }

  const { error } = await supabase.from("song_audio").upsert({
    song_id: songId,
    user_id: user.id,
    source: "file",
    youtube_id: null,
    youtube_title: null,
    file_path: filePath,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  revalidatePath(`/playlists`);
  return { ok: true };
}

export async function saveSync(
  songId: string,
  granularity: "line" | "word",
  stamps: SyncStamp[],
): Promise<ActionResult> {
  if (!isUuid(songId)) return { ok: false, error: "id" };
  if (granularity !== "line" && granularity !== "word") {
    return { ok: false, error: "granularity" };
  }
  if (!validateStamps(stamps)) return { ok: false, error: "stamps" };

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const { error } = await supabase.from("song_sync").upsert({
    song_id: songId,
    user_id: user.id,
    granularity,
    stamps,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "db" };

  return { ok: true };
}
