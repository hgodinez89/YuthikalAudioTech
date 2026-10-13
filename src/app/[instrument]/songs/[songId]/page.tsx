import { Check, ChevronLeft, ChevronRight, Music, Pencil, Play } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cache } from "react";
import type { ChordDataMap } from "@/components/chord-sheet";
import { SongBook } from "@/components/song-book";
import { SongCalibration } from "@/components/song-calibration";
import { SongEditor } from "@/components/song-editor";
import { SongKaraoke } from "@/components/song-karaoke";
import type { SongAudioRow, SongSyncRow } from "@/lib/audio";
import { chordIdFromName } from "@/lib/chord-search";
import { collectChords, parseChordPro } from "@/lib/chordpro";
import { chordDbId, type Instrument } from "@/lib/instruments";
import { keyLabel, type SongRow } from "@/lib/songs";
import { supabaseWithSession } from "@/lib/supabase-server";

type Mode = "view" | "edit" | "karaoke";
type Step = "lyrics" | "audio";

const getSong = cache(async (songId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return null;
  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("songs")
    .select("id,playlist_id,name,description,key_note,content,created_at")
    .eq("id", songId)
    .maybeSingle<SongRow>();
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

/** Diagramas (del instrumento activo) de cada acorde usado en la canción. */
async function loadChordData(
  instrument: Instrument,
  names: string[],
): Promise<ChordDataMap> {
  const idByName = new Map<string, string>();
  for (const name of names) {
    const slug = chordIdFromName(name);
    if (slug) idByName.set(name, chordDbId(instrument, slug));
  }
  if (idByName.size === 0) return {};

  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("chords")
    .select("id,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)")
    .eq("instrument", instrument)
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

/** Modo y paso desde la URL (?mode=calibrate de enlaces viejos → Audio). */
function readMode(rawMode?: string, rawStep?: string): { mode: Mode; step: Step } {
  if (rawMode === "calibrate") return { mode: "edit", step: "audio" };
  const mode: Mode = rawMode === "edit" || rawMode === "karaoke" ? rawMode : "view";
  return { mode, step: rawStep === "audio" ? "audio" : "lyrics" };
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<{ instrument: string; songId: string }>;
  searchParams: Promise<{ mode?: string; step?: string }>;
}) {
  const [{ instrument: rawInstrument, songId }, { mode: rawMode, step: rawStep }] =
    await Promise.all([params, searchParams]);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  const { mode, step } = readMode(rawMode, rawStep);
  const songUrl = `/${instrument}/songs/${songId}`;

  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(songUrl)}`);

  const song = await getSong(songId);
  if (!song) notFound();

  const t = await getTranslations("songView");

  const parsed = parseChordPro(song.content);
  const chordData =
    mode === "view" || mode === "karaoke"
      ? await loadChordData(instrument, collectChords(parsed))
      : {};

  let audio: SongAudioRow | null = null;
  let sync: SongSyncRow | null = null;
  if (step === "audio" || mode === "karaoke") {
    const [audioRes, syncRes] = await Promise.all([
      supabase
        .from("song_audio")
        .select("song_id,source,youtube_id,youtube_title,file_path")
        .eq("song_id", songId)
        .maybeSingle<SongAudioRow>(),
      supabase
        .from("song_sync")
        .select("song_id,granularity,stamps")
        .eq("song_id", songId)
        .maybeSingle<SongSyncRow>(),
    ]);
    audio = audioRes.data;
    sync = syncRes.data;
  }

  const playlists =
    mode === "edit" && step === "lyrics"
      ? ((
          await supabase
            .from("playlists")
            .select("id,name")
            .order("created_at", { ascending: false })
        ).data ?? [])
      : [];

  const emptyState = (
    <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
      <h3 className="mb-2 text-lg font-bold">{t("emptyTitle")}</h3>
      <p className="mb-[22px] max-w-[380px] text-sm text-tert">{t("emptyDesc")}</p>
      <Link
        href={`${songUrl}?mode=edit`}
        className="yk-gradient inline-flex items-center gap-2 rounded-xl px-[22px] py-3 text-sm font-bold"
      >
        <Pencil size={15} strokeWidth={2.2} />
        {t("emptyCta")}
      </Link>
    </div>
  );

  const steps: { key: Step; label: string }[] = [
    { key: "lyrics", label: t("stepLyrics") },
    { key: "audio", label: t("stepAudio") },
  ];

  return (
    <div
      className={`mx-auto px-5 pb-[100px] pt-6 ${
        mode === "view"
          ? // Modo libro: la vista ocupa la altura bajo el header (~71,3 px; 72 evita
            // una barra de scroll por fracciones de píxel).
            "max-w-[1600px] has-[[data-book]]:flex has-[[data-book]]:h-[calc(100dvh-72px)] has-[[data-book]]:flex-col has-[[data-book]]:pb-4"
          : mode === "karaoke"
            ? "max-w-[860px]"
            : step === "audio"
              ? "max-w-[1180px] pb-[180px]"
              : "max-w-[1240px]"
      }`}
    >
      {/* Ruta: en Editar/Audio el nombre de la canción vuelve a la letra
          (que se abre en el modo, zoom y página donde la dejaste). */}
      <nav
        aria-label={t("breadcrumb")}
        className="mb-6 flex min-w-0 items-center gap-2 self-start text-[13px] text-tert"
      >
        <Link
          href={`/${instrument}/songs`}
          className="inline-flex shrink-0 items-center gap-2 hover:text-ink"
        >
          <ChevronLeft size={15} strokeWidth={2} />
          {t("backToSongs")}
        </Link>
        {mode === "edit" && (
          <>
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-mute" />
            <Link
              href={songUrl}
              title={t("backToLyrics")}
              className="truncate font-semibold text-sub hover:text-ink"
            >
              {song.name}
            </Link>
          </>
        )}
      </nav>

      {/* CABECERA DE LA CANCIÓN */}
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
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
                {t("keyPrefix")}{" "}
                <span className="text-ink">{keyLabel(song.key_note)}</span>
              </span>
            )}
          </div>
        </div>

        {/* ACCIONES: Tocar es la principal; Editar, la secundaria */}
        {mode === "view" ? (
          <div className="flex gap-2.5">
            <Link
              href={`${songUrl}?mode=edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-edge-2 bg-surface-2 px-[18px] py-3 text-sm font-semibold"
            >
              <Pencil size={16} strokeWidth={2} />
              {t("edit")}
            </Link>
            {parsed.sections.length > 0 && (
              <Link
                href={`${songUrl}?mode=karaoke`}
                className="yk-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-bold shadow-[0_8px_30px_rgba(46,107,240,0.32)]"
              >
                <Play size={17} fill="currentColor" strokeWidth={0} />
                {t("play")}
              </Link>
            )}
          </div>
        ) : mode === "edit" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pasos del editor: 1 Letra → 2 Audio */}
            <div className="flex rounded-[14px] border border-edge bg-surface-3 p-[5px]">
              {steps.map((s, i) => (
                <Link
                  key={s.key}
                  href={`${songUrl}?mode=edit${s.key === "audio" ? "&step=audio" : ""}`}
                  aria-current={s.key === step ? "step" : undefined}
                  className={
                    s.key === step
                      ? "yk-gradient flex items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-[9px] text-sm font-semibold"
                      : "flex items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-[9px] text-sm font-semibold text-sub hover:text-ink"
                  }
                >
                  <span
                    className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${
                      s.key === step ? "bg-black/15" : "border border-edge-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {s.label}
                </Link>
              ))}
            </div>
            <Link
              href={songUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
            >
              <Check size={16} strokeWidth={2.4} className="text-accent" />
              {t("done")}
            </Link>
          </div>
        ) : null}
      </div>

      {/* CONTENIDO SEGÚN MODO */}
      {mode === "view" &&
        (parsed.sections.length > 0 ? (
          <SongBook songId={songId} sections={parsed.sections} chords={chordData} />
        ) : (
          emptyState
        ))}

      {mode === "edit" && step === "lyrics" && (
        <SongEditor song={song} instrument={instrument} playlists={playlists} />
      )}

      {mode === "edit" && step === "audio" && (
        <SongCalibration song={song} audio={audio} sync={sync} />
      )}

      {mode === "karaoke" &&
        (parsed.sections.length > 0 ? (
          <SongKaraoke
            song={song}
            audio={audio}
            sync={sync}
            chords={chordData}
            exitHref={songUrl}
            syncHref={`${songUrl}?mode=edit&step=audio`}
          />
        ) : (
          emptyState
        ))}
    </div>
  );
}
