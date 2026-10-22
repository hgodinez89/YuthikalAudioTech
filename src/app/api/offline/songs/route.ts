import { NextResponse, type NextRequest } from "next/server";
import { reconcileSync, type SongSyncRow } from "@/lib/audio";
import { loadChordData, loadCustomChords } from "@/lib/chord-data";
import { collectChords, parseChordPro } from "@/lib/chordpro";
import { isUuid } from "@/lib/ids";
import { INSTRUMENTS } from "@/lib/instruments";
import {
  MAX_OFFLINE_SONGS,
  songVersion,
  type OfflineChords,
  type OfflinePayload,
  type OfflineSong,
} from "@/lib/offline-songs";
import type { SongRow } from "@/lib/songs";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/* Ids por consulta: van en la URL de PostgREST. */
const CHUNK = 100;

type Row = SongRow & {
  playlist_position: number | null;
  updated_at: string;
  audio: { source: "youtube" | "file" } | null;
  sync: (SongSyncRow & { targets: string[] | null; updated_at: string }) | null;
};

/* Nunca a una caché (ni del navegador ni compartida): son datos privados. */
const PRIVATE = { "Cache-Control": "private, no-store" };

const fail = (status: number) => NextResponse.json(null, { status, headers: PRIVATE });

/**
 * Canciones para guardarlas en el dispositivo y usarlas sin conexión:
 * letra, sincronización, diagramas de sus acordes en los 3 instrumentos
 * (con los acordes propios) y las playlists. RLS: solo las del usuario.
 */
export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return fail(415);
  }
  const body: unknown = await request.json().catch(() => null);
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length > MAX_OFFLINE_SONGS ||
    !ids.every(isUuid) ||
    new Set(ids).size !== ids.length
  ) {
    return fail(400);
  }

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return fail(401);

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  const [songResults, playlistsRes, ...custom] = await Promise.all([
    Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("songs")
          .select(
            "id,playlist_id,playlist_position,name,description,key_note,instruments,content,created_at,updated_at,audio:song_audio(source),sync:song_sync(song_id,granularity,stamps,targets,end_at,updated_at)",
          )
          .in("id", chunk)
          .returns<Row[]>(),
      ),
    ),
    supabase
      .from("playlists")
      .select("id,name,songs(count)")
      .returns<{ id: string; name: string; songs: { count: number }[] }[]>(),
    ...INSTRUMENTS.map((instrument) => loadCustomChords(supabase, instrument)),
  ]);
  if (playlistsRes.error || songResults.some((r) => r.error)) {
    console.error("offline songs:", playlistsRes.error?.message);
    return fail(502);
  }

  const rows = songResults.flatMap((r) => r.data ?? []);
  const songs: OfflineSong[] = rows.map(({ audio, sync, updated_at, ...song }) => {
    const reconciled = sync ? reconcileSync(sync, song.content) : null;
    return {
      ...song,
      audio,
      sync: reconciled?.sync ?? null,
      syncMissing: reconciled?.missing ?? 0,
      version: songVersion({
        updated_at,
        sync_updated_at: sync?.updated_at ?? null,
        playlist_id: song.playlist_id,
        playlist_position: song.playlist_position,
      }),
    };
  });

  // Diagramas de todos los acordes de lo pedido, una vez por instrumento.
  const names = [
    ...new Set(songs.flatMap((s) => collectChords(parseChordPro(s.content)))),
  ];
  const maps = await Promise.all(
    INSTRUMENTS.map((instrument, i) => loadChordData(instrument, names, custom[i])),
  );
  const chords = Object.fromEntries(
    INSTRUMENTS.map((instrument, i) => [instrument, maps[i]]),
  ) as OfflineChords;

  const payload: OfflinePayload = {
    userId,
    songs,
    playlists: (playlistsRes.data ?? []).map(({ songs: count, ...p }) => ({
      ...p,
      songs_count: count[0]?.count ?? 0,
    })),
    chords,
  };
  return NextResponse.json(payload, { headers: PRIVATE });
}
