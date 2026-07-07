import { ChevronLeft, Eye, Music, Pencil, Play, SlidersVertical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache, type ReactNode } from "react";
import { ChordSheet, type ChordDataMap } from "@/components/chord-sheet";
import { SongEditor } from "@/components/song-editor";
import { chordIdFromName } from "@/lib/chord-search";
import { collectChords, parseChordPro } from "@/lib/chordpro";
import { keyLabel, type SongRow } from "@/lib/songs";
import { supabaseWithSession } from "@/lib/supabase-server";

const MODES = ["view", "edit", "calibrate", "karaoke"] as const;
type Mode = (typeof MODES)[number];

const getSong = cache(async (songId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return null;
  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("songs")
    .select("id,playlist_id,name,description,key_note,content,created_at")
    .eq("id", songId)
    .single<SongRow>();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ songId: string }>;
}): Promise<Metadata> {
  const { songId } = await params;
  const song = await getSong(songId);
  return { title: song ? `${song.name} — Yuthikal AudioTech` : "Yuthikal AudioTech" };
}

/** Datos de diagrama para cada acorde usado en la canción (para popover/leyenda). */
async function loadChordData(names: string[]): Promise<ChordDataMap> {
  const idByName = new Map<string, string>();
  for (const name of names) {
    const id = chordIdFromName(name);
    if (id) idByName.set(name, id);
  }
  if (idByName.size === 0) return {};

  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("chords")
    .select("id,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)")
    .in("id", [...idByName.values()])
    .eq("positions.position", 1);

  const byId = new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        nameEs: row.name_es as string,
        position: (
          row.positions as { base_fret: number; frets: number[]; barres: number[] }[]
        )[0],
      },
    ]),
  );

  const map: ChordDataMap = {};
  for (const [name, id] of idByName) {
    const found = byId.get(id);
    if (found) {
      map[name] = {
        name,
        nameEs: found.nameEs,
        frets: found.position.frets,
        barres: found.position.barres,
        baseFret: found.position.base_fret,
      };
    }
  }
  return map;
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; songId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id: playlistId, songId }, { mode: rawMode }] = await Promise.all([
    params,
    searchParams,
  ]);
  const mode: Mode = MODES.includes(rawMode as Mode) ? (rawMode as Mode) : "view";

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const song = await getSong(songId);
  if (!song || song.playlist_id !== playlistId) notFound();

  const t = await getTranslations("songView");
  const tSongs = await getTranslations("songs");

  const parsed = parseChordPro(song.content);
  const chordData = mode === "view" ? await loadChordData(collectChords(parsed)) : {};

  const tabs: { mode: Mode; label: string; icon: ReactNode }[] = [
    { mode: "view", label: tSongs("view"), icon: <Eye size={15} strokeWidth={2} /> },
    { mode: "edit", label: tSongs("edit"), icon: <Pencil size={15} strokeWidth={2} /> },
    {
      mode: "calibrate",
      label: tSongs("calibrate"),
      icon: <SlidersVertical size={15} strokeWidth={2} />,
    },
    {
      mode: "karaoke",
      label: tSongs("karaoke"),
      icon: <Play size={15} fill="currentColor" strokeWidth={0} />,
    },
  ];

  return (
    <div
      className={`mx-auto px-5 pb-[100px] pt-6 ${mode === "edit" ? "max-w-[1240px]" : "max-w-[860px]"}`}
    >
      <Link
        href={`/playlists/${playlistId}`}
        className="mb-6 inline-flex items-center gap-2 text-[13px] text-tert hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2} />
        {t("backToPlaylist")}
      </Link>

      {/* CABECERA DE LA CANCIÓN */}
      <div className="mb-2">
        <h1 className="mb-1.5 text-[30px] font-extrabold tracking-[-0.02em]">
          {song.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3.5">
          {(parsed.artist ?? song.description) && (
            <span className="text-[15px] text-sub">
              {parsed.artist ?? song.description}
            </span>
          )}
          {song.key_note && (
            <span className="inline-flex items-center gap-[7px] rounded-full border border-edge-2 bg-surface-2 px-3 py-[5px] text-[12.5px] font-semibold text-sub">
              <Music size={13} strokeWidth={2} className="text-accent" />
              {t("keyPrefix")} <span className="text-ink">{keyLabel(song.key_note)}</span>
            </span>
          )}
        </div>
      </div>

      {/* TABS DE MODO */}
      <div className="mb-[30px] mt-[22px] flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-[14px] border border-edge bg-surface-3 p-[5px] [scrollbar-width:none]">
        {tabs.map((tab) => (
          <Link
            key={tab.mode}
            href={`/playlists/${playlistId}/songs/${songId}${tab.mode === "view" ? "" : `?mode=${tab.mode}`}`}
            className={
              tab.mode === mode
                ? "yk-gradient flex items-center gap-[7px] whitespace-nowrap rounded-[10px] px-4 py-[9px] text-sm font-semibold"
                : "flex items-center gap-[7px] whitespace-nowrap rounded-[10px] px-4 py-[9px] text-sm font-semibold text-sub hover:text-ink"
            }
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* CONTENIDO SEGÚN MODO */}
      {mode === "view" &&
        (parsed.sections.length > 0 ? (
          <ChordSheet sections={parsed.sections} chords={chordData} />
        ) : (
          <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
            <h3 className="mb-2 text-lg font-bold">{t("emptyTitle")}</h3>
            <p className="mb-[22px] max-w-[380px] text-sm text-tert">{t("emptyDesc")}</p>
            <Link
              href={`/playlists/${playlistId}/songs/${songId}?mode=edit`}
              className="yk-gradient inline-flex items-center gap-2 rounded-xl px-[22px] py-3 text-sm font-bold"
            >
              <Pencil size={15} strokeWidth={2.2} />
              {t("emptyCta")}
            </Link>
          </div>
        ))}

      {mode === "edit" && <SongEditor song={song} />}

      {mode !== "view" && mode !== "edit" && (
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-accent">
            {t("comingSoonEyebrow")}
          </div>
          <p className="max-w-[380px] text-sm text-tert">{t(`comingSoon.${mode}`)}</p>
        </div>
      )}
    </div>
  );
}
