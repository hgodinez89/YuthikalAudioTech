import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginCard } from "@/components/login-card";
import { WipeOfflineSongs } from "@/components/offline-song-controls";
import { SongsView } from "@/components/songs-view";
import { dbError } from "@/lib/db-error";
import type { Instrument } from "@/lib/instruments";
import { songVersion } from "@/lib/offline-songs";
import type { PlaylistRow } from "@/lib/playlists";
import type { SongListRow } from "@/lib/songs";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "songs" });
  // Privada: no se indexa.
  return { title: `${t("title")} — Yuthikal AudioTech`, robots: { index: false } };
}

const SONG_COLUMNS =
  "id,playlist_id,playlist_position,name,description,key_note,instruments,created_at,updated_at,audio:song_audio(source,youtube_title),sync:song_sync(granularity,stamp_count,updated_at)";

type SongWithMeta = Omit<
  SongListRow,
  "source" | "youtubeTitle" | "synced" | "stampCount" | "granularity" | "version"
> & {
  updated_at: string;
  audio: { source: "youtube" | "file"; youtube_title: string | null } | null;
  sync: { granularity: "line" | "word"; stamp_count: number; updated_at: string } | null;
};

export default async function SongsPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  // El layout del instrumento ya validó el segmento.
  const { locale, instrument } = await params;
  setRequestLocale(locale);

  const supabase = await supabaseWithSession();

  // Sin sesión: login en la misma página, que regresa aquí al terminar.
  const userId = await sessionUserId(supabase);
  if (!userId) {
    const t = await getTranslations({ locale, namespace: "songs" });
    return (
      <>
        {/* Sin sesión no quedan canciones de nadie en el dispositivo. */}
        <WipeOfflineSongs />
        <LoginCard
          embedded
          next={`/${locale}/${instrument}/songs`}
          title={t("gateTitle")}
          subtitle={t("gateSubtitle")}
        />
      </>
    );
  }

  // Playlists y TODAS las canciones a la vez: el filtro ?list= se aplica en el
  // cliente, así cambiar de playlist no vuelve al servidor.
  // song_audio y song_sync son relaciones uno-a-uno (song_id es su PK),
  // así que PostgREST las devuelve como objeto o null, no como array.
  const [playlistsRes, songsRes] = await Promise.all([
    supabase
      .from("playlists")
      .select("id,name,description,genre,genre_other,rating_like,created_at,songs(count)")
      .order("created_at", { ascending: false })
      .returns<(PlaylistRow & { songs: { count: number }[] })[]>(),
    supabase
      .from("songs")
      .select(SONG_COLUMNS)
      .order("created_at", { ascending: false })
      .returns<SongWithMeta[]>(),
  ]);
  if (playlistsRes.error) throw dbError(playlistsRes.error, playlistsRes.status);
  if (songsRes.error) throw dbError(songsRes.error, songsRes.status);

  const playlists = playlistsRes.data ?? [];
  const songs = songsRes.data ?? [];

  const rows: SongListRow[] = songs.map(({ audio, sync, updated_at, ...song }) => ({
    ...song,
    version: songVersion({
      updated_at,
      sync_updated_at: sync?.updated_at ?? null,
      playlist_id: song.playlist_id,
      playlist_position: song.playlist_position,
    }),
    source: audio?.source ?? null,
    youtubeTitle: audio?.youtube_title ?? null,
    synced: (sync?.stamp_count ?? 0) > 0,
    stampCount: sync?.stamp_count ?? 0,
    granularity: sync?.granularity ?? null,
  }));

  return (
    <SongsView
      userId={userId}
      instrument={instrument as Instrument}
      songs={rows}
      playlists={playlists.map(({ songs: count, ...p }) => ({
        ...p,
        songs_count: count[0]?.count ?? 0,
      }))}
    />
  );
}
