import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConcertView, type ConcertSong } from "@/components/concert-view";
import { redirect } from "@/i18n/navigation";
import { loadChordData, loadCustomChords } from "@/lib/chord-data";
import { collectChords, parseChordPro } from "@/lib/chordpro";
import { dbError } from "@/lib/db-error";
import { isUuid } from "@/lib/ids";
import type { Instrument } from "@/lib/instruments";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "concert" });
  // Privada: no se indexa.
  return { title: `${t("title")} — Yuthikal AudioTech`, robots: { index: false } };
}

/**
 * Modo concierto de una playlist (?list=): trae todas sus canciones en el
 * orden del setlist y los diagramas de todos sus acordes de una sola vez.
 */
export default async function ConcertPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; instrument: string }>;
  searchParams: Promise<{ list?: string }>;
}) {
  const [{ locale, instrument: rawInstrument }, { list }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  const songsUrl = `/${instrument}/songs`;
  if (!list || !isUuid(list)) redirect({ href: songsUrl, locale });

  const supabase = await supabaseWithSession();
  if (!(await sessionUserId(supabase))) {
    const back = `/${locale}${songsUrl}/concert?list=${list}`;
    redirect({ href: `/login?next=${encodeURIComponent(back)}`, locale });
  }

  // RLS: solo la playlist y las canciones del usuario.
  const [playlistRes, songsRes, customChords] = await Promise.all([
    supabase.from("playlists").select("id,name").eq("id", list).maybeSingle<{
      id: string;
      name: string;
    }>(),
    supabase
      .from("songs")
      .select("id,name,key_note,content")
      .eq("playlist_id", list)
      .order("playlist_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .returns<{ id: string; name: string; key_note: string; content: string }[]>(),
    loadCustomChords(supabase, instrument),
  ]);
  if (playlistRes.error) throw dbError(playlistRes.error, playlistRes.status);
  if (songsRes.error) throw dbError(songsRes.error, songsRes.status);
  if (!playlistRes.data) notFound();
  const rows = songsRes.data ?? [];
  if (rows.length === 0) redirect({ href: `${songsUrl}?list=${list}`, locale });

  const parsed = rows.map((row) => parseChordPro(row.content));
  const songs: ConcertSong[] = rows.map((row, i) => ({
    id: row.id,
    name: row.name,
    keyNote: row.key_note,
    capo: parsed[i].capo,
    tempo: parsed[i].tempo,
    sections: parsed[i].sections,
  }));
  // Diagramas de todo el setlist en una consulta (acordes sin repetir).
  const names = [...new Set(parsed.flatMap(collectChords))];
  const chords = await loadChordData(instrument, names, customChords);

  return (
    <ConcertView
      playlistName={playlistRes.data.name}
      songs={songs}
      chords={chords}
      exitHref={`${songsUrl}?list=${list}`}
    />
  );
}
