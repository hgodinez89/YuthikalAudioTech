import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginCard } from "@/components/login-card";
import { SongsView } from "@/components/songs-view";
import { dbError } from "@/lib/db-error";
import { isUuid } from "@/lib/ids";
import type { Instrument } from "@/lib/instruments";
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
  "id,playlist_id,playlist_position,name,description,key_note,instruments,created_at,audio:song_audio(source,youtube_title),sync:song_sync(granularity,stamp_count)";

type SongWithMeta = Omit<
  SongListRow,
  "source" | "youtubeTitle" | "synced" | "stampCount" | "granularity"
> & {
  audio: { source: "youtube" | "file"; youtube_title: string | null } | null;
  sync: { granularity: "line" | "word"; stamp_count: number } | null;
};

export default async function SongsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; instrument: string }>;
  searchParams: Promise<{ list?: string }>;
}) {
  // El layout del instrumento ya validó el segmento.
  const [{ locale, instrument }, { list }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const supabase = await supabaseWithSession();

  // Sin sesión: login en la misma página, que regresa aquí al terminar.
  if (!(await sessionUserId(supabase))) {
    const t = await getTranslations({ locale, namespace: "songs" });
    return (
      <LoginCard
        embedded
        next={`/${locale}/${instrument}/songs`}
        title={t("gateTitle")}
        subtitle={t("gateSubtitle")}
      />
    );
  }

  // Playlists y canciones a la vez. Una ?list= que no sea del usuario no
  // devuelve canciones (RLS) y cae en "Todas" más abajo.
  const listId = list && isUuid(list) ? list : null;
  let songsQuery = supabase
    .from("songs")
    .select(SONG_COLUMNS)
    .order("created_at", { ascending: false });
  if (listId) songsQuery = songsQuery.eq("playlist_id", listId);

  // song_audio y song_sync son relaciones uno-a-uno (song_id es su PK),
  // así que PostgREST las devuelve como objeto o null, no como array.
  const [playlistsRes, songsRes] = await Promise.all([
    supabase
      .from("playlists")
      .select("id,name,description,genre,genre_other,rating_like,created_at,songs(count)")
      .order("created_at", { ascending: false })
      .returns<(PlaylistRow & { songs: { count: number }[] })[]>(),
    songsQuery.returns<SongWithMeta[]>(),
  ]);
  if (playlistsRes.error) throw dbError(playlistsRes.error, playlistsRes.status);
  if (songsRes.error) throw dbError(songsRes.error, songsRes.status);

  const playlists = playlistsRes.data ?? [];
  const activeList = playlists.find((p) => p.id === listId) ?? null;
  // Una ?list= ajena o borrada: se muestran todas, sin filtro.
  const songs =
    listId && !activeList
      ? ((
          await supabase
            .from("songs")
            .select(SONG_COLUMNS)
            .order("created_at", { ascending: false })
            .returns<SongWithMeta[]>()
        ).data ?? [])
      : (songsRes.data ?? []);

  const rows: SongListRow[] = songs.map(({ audio, sync, ...song }) => ({
    ...song,
    source: audio?.source ?? null,
    youtubeTitle: audio?.youtube_title ?? null,
    synced: (sync?.stamp_count ?? 0) > 0,
    stampCount: sync?.stamp_count ?? 0,
    granularity: sync?.granularity ?? null,
  }));

  return (
    <SongsView
      instrument={instrument as Instrument}
      songs={rows}
      playlists={playlists.map(({ songs: count, ...p }) => ({
        ...p,
        songs_count: count[0]?.count ?? 0,
      }))}
      activeListId={activeList?.id ?? null}
    />
  );
}
