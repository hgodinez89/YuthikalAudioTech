import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginCard } from "@/components/login-card";
import { SongsView, type SongListRow } from "@/components/songs-view";
import type { Instrument } from "@/lib/instruments";
import type { PlaylistRow } from "@/lib/playlists";
import { supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("songs");
  return { title: `${t("title")} — Yuthikal AudioTech` };
}

export default async function SongsPage({
  params,
  searchParams,
}: {
  params: Promise<{ instrument: string }>;
  searchParams: Promise<{ list?: string }>;
}) {
  // El layout del instrumento ya validó el segmento.
  const [{ instrument }, { list }] = await Promise.all([params, searchParams]);

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sin sesión: login en la misma página, que regresa aquí al terminar.
  if (!user) {
    const t = await getTranslations("songs");
    return (
      <LoginCard
        embedded
        next={`/${instrument}/songs`}
        title={t("gateTitle")}
        subtitle={t("gateSubtitle")}
      />
    );
  }

  const { data: playlists, error: playlistsError } = await supabase
    .from("playlists")
    .select(
      "id,name,description,genre,genre_other,rating_like,rating_difficulty,created_at,songs(count)",
    )
    .order("created_at", { ascending: false })
    .returns<(PlaylistRow & { songs: { count: number }[] })[]>();
  if (playlistsError) throw new Error(playlistsError.message);

  const activeList = playlists?.find((p) => p.id === list) ?? null;

  let query = supabase
    .from("songs")
    .select(
      "id,playlist_id,name,description,key_note,instruments,created_at,audio:song_audio(source,youtube_title),sync:song_sync(granularity,stamps)",
    )
    .order("created_at", { ascending: false });
  if (activeList) query = query.eq("playlist_id", activeList.id);

  // song_audio y song_sync son relaciones uno-a-uno (song_id es su PK),
  // así que PostgREST las devuelve como objeto o null, no como array.
  const { data: songs, error: songsError } = await query.returns<
    (Omit<
      SongListRow,
      "source" | "youtubeTitle" | "synced" | "stampCount" | "granularity"
    > & {
      audio: { source: "youtube" | "file"; youtube_title: string | null } | null;
      sync: { granularity: "line" | "word"; stamps: unknown[] } | null;
    })[]
  >();
  if (songsError) throw new Error(songsError.message);

  const rows: SongListRow[] = (songs ?? []).map(({ audio, sync, ...song }) => ({
    ...song,
    source: audio?.source ?? null,
    youtubeTitle: audio?.youtube_title ?? null,
    synced: (sync?.stamps?.length ?? 0) > 0,
    stampCount: sync?.stamps?.length ?? 0,
    granularity: sync?.granularity ?? null,
  }));

  return (
    <SongsView
      instrument={instrument as Instrument}
      songs={rows}
      playlists={(playlists ?? []).map(({ songs: count, ...p }) => ({
        ...p,
        songs_count: count[0]?.count ?? 0,
      }))}
      activeListId={activeList?.id ?? null}
    />
  );
}
