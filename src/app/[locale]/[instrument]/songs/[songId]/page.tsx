import { Check, ChevronLeft, ChevronRight, Music, Pencil, Play } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/navigation";
import { buttonClass } from "@/components/button";
import { PendingIcon } from "@/components/link-pending";
import { SongDownloadButton } from "@/components/offline-song-controls";
import { OnlineLink } from "@/components/online-link";
import { SongInstruments } from "@/components/song-instruments";
import { YouTubeHints } from "@/components/youtube-hints";
import {
  SongBook,
  SongCalibration,
  SongEditor,
  SongKaraoke,
} from "@/components/song-modes";
import { reconcileSync, type SongAudioRow, type SongSyncRow } from "@/lib/audio";
import { collectChords, parseChordPro } from "@/lib/chordpro";
import { loadChordData, loadCustomChords } from "@/lib/chord-data";
import { dbError } from "@/lib/db-error";
import { isUuid } from "@/lib/ids";
import { songVersion } from "@/lib/offline-songs";
import type { Instrument } from "@/lib/instruments";
import { keyLabel, type SongRow } from "@/lib/songs";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

type Mode = "view" | "edit" | "karaoke";

/* La canción y lo que define su copia descargada (ver songVersion). */
type SongWithVersion = SongRow & {
  updated_at: string;
  playlist_position: number | null;
  playlist: { name: string } | null;
  sync_meta: { updated_at: string } | null;
};
type Step = "lyrics" | "audio";

const getSong = cache(async (songId: string) => {
  if (!isUuid(songId)) return null;
  const supabase = await supabaseWithSession();
  const { data, error, status } = await supabase
    .from("songs")
    .select(
      "id,playlist_id,name,description,key_note,instruments,content,created_at,updated_at,playlist_position,playlist:playlists(name),sync_meta:song_sync(updated_at)",
    )
    .eq("id", songId)
    .maybeSingle<SongWithVersion>();
  // Sin fila (no existe o es ajena, por RLS) → 404; un fallo de la base no es un 404.
  if (error) throw dbError(error, status);
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ songId: string }>;
}): Promise<Metadata> {
  const { songId } = await params;
  const song = await getSong(songId);
  return {
    title: song ? `${song.name} — Yuthikal AudioTech` : "Yuthikal AudioTech",
    // Privada: no se indexa.
    robots: { index: false },
  };
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
  params: Promise<{ locale: string; instrument: string; songId: string }>;
  searchParams: Promise<{ mode?: string; step?: string }>;
}) {
  const [
    { locale, instrument: rawInstrument, songId },
    { mode: rawMode, step: rawStep },
  ] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;
  const { mode, step } = readMode(rawMode, rawStep);
  const songUrl = `/${instrument}/songs/${songId}`;

  const supabase = await supabaseWithSession();
  if (!(await sessionUserId(supabase))) {
    redirect({
      href: `/login?next=${encodeURIComponent(`/${locale}${songUrl}`)}`,
      locale,
    });
  }

  /* Todo lo que solo depende de la canción, a la vez; los diagramas de
     acordes, después (dependen de la letra). */
  const needsAudio = step === "audio" || mode === "karaoke";
  // Diagramas: al ver, en karaoke y en el editor de letra (sus acordes sin diagrama).
  const needsChords = !(mode === "edit" && step === "audio");
  const [song, audioRes, syncRes, playlistsRes, customChords] = await Promise.all([
    getSong(songId),
    needsAudio
      ? supabase
          .from("song_audio")
          .select("song_id,source,youtube_id,youtube_title,file_path")
          .eq("song_id", songId)
          .maybeSingle<SongAudioRow>()
      : null,
    needsAudio
      ? supabase
          .from("song_sync")
          .select("song_id,granularity,stamps,targets,end_at")
          .eq("song_id", songId)
          .maybeSingle<SongSyncRow & { targets: string[] | null }>()
      : null,
    mode === "edit" && step === "lyrics"
      ? supabase
          .from("playlists")
          .select("id,name")
          .order("created_at", { ascending: false })
      : null,
    needsChords ? loadCustomChords(supabase, instrument) : [],
  ]);
  if (!song) notFound();
  for (const res of [audioRes, syncRes, playlistsRes]) {
    if (res?.error) throw dbError(res.error, res.status);
  }

  const t = await getTranslations({ locale, namespace: "songView" });

  const parsed = parseChordPro(song.content);
  const chordData = needsChords
    ? await loadChordData(instrument, collectChords(parsed), customChords)
    : {};

  const audio: SongAudioRow | null = audioRes?.data ?? null;
  let sync: SongSyncRow | null = null;
  /* Objetivos nuevos sin marca porque la letra cambió después de sincronizar. */
  let syncMissing = 0;
  if (syncRes?.data) {
    const reconciled = reconcileSync(syncRes.data, song.content);
    sync = reconciled.sync;
    syncMissing = reconciled.missing;
  }
  const playlists = playlistsRes?.data ?? [];

  const emptyState = (
    <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
      <h2 className="mb-2 text-lg font-bold">{t("emptyTitle")}</h2>
      <p className="mb-[22px] max-w-[380px] text-sm text-tert">{t("emptyDesc")}</p>
      <Link href={`${songUrl}?mode=edit`} className={buttonClass("primary")}>
        <PendingIcon size={15}>
          <Pencil size={15} strokeWidth={2.2} />
        </PendingIcon>
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
          <PendingIcon size={15}>
            <ChevronLeft size={15} strokeWidth={2} />
          </PendingIcon>
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
            {/* {capo:} y {tempo:} de la letra, junto a la tonalidad */}
            {parsed.capo && (
              <span className="inline-flex items-center rounded-full border border-edge-2 bg-surface-2 px-3 py-[5px] text-[12.5px] font-semibold text-ink">
                {t("capo", { n: parsed.capo })}
              </span>
            )}
            {parsed.tempo && (
              <span className="inline-flex items-center gap-[7px] rounded-full border border-edge-2 bg-surface-2 px-3 py-[5px] text-[12.5px] font-semibold text-ink">
                <span className="text-accent">♩</span>
                {t("tempo", { bpm: parsed.tempo })}
              </span>
            )}
            <SongInstruments instruments={song.instruments} />
          </div>
        </div>

        {/* ACCIONES: Tocar es la principal; Editar, la secundaria. Sin
            loading.tsx aquí: la pantalla sigue hasta que llega el modo y el
            botón pulsado muestra que está cargando. */}
        {mode === "view" ? (
          <div className="flex flex-wrap gap-2.5">
            {/* Descargar para usar sin conexión (y mantener la copia al día). */}
            <SongDownloadButton
              songId={songId}
              playlistId={song.playlist_id}
              playlistName={song.playlist?.name ?? null}
              version={songVersion({
                updated_at: song.updated_at,
                sync_updated_at: song.sync_meta?.updated_at ?? null,
                playlist_id: song.playlist_id,
                playlist_position: song.playlist_position,
              })}
            />
            {/* Editar necesita conexión: sin red se ve desactivado. */}
            <OnlineLink
              href={`${songUrl}?mode=edit`}
              className={buttonClass("secondary")}
            >
              <PendingIcon size={16}>
                <Pencil size={16} strokeWidth={2} />
              </PendingIcon>
              {t("edit")}
            </OnlineLink>
            {parsed.sections.length > 0 && (
              <Link
                href={`${songUrl}?mode=karaoke`}
                className={`${buttonClass("primary", "lg")} shadow-fab`}
              >
                <PendingIcon size={17}>
                  <Play size={17} fill="currentColor" strokeWidth={0} />
                </PendingIcon>
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
                    <PendingIcon size={12}>{i + 1}</PendingIcon>
                  </span>
                  {s.label}
                </Link>
              ))}
            </div>
            <Link href={songUrl} className={buttonClass("secondary")}>
              <PendingIcon size={16}>
                <Check size={16} strokeWidth={2.4} className="text-accent" />
              </PendingIcon>
              {t("done")}
            </Link>
          </div>
        ) : null}
      </div>

      {/* CONTENIDO SEGÚN MODO */}
      {needsAudio && audio?.source === "youtube" && <YouTubeHints />}
      {mode === "view" &&
        (parsed.sections.length > 0 ? (
          <SongBook songId={songId} sections={parsed.sections} chords={chordData} />
        ) : (
          emptyState
        ))}

      {mode === "edit" && step === "lyrics" && (
        <SongEditor
          song={song}
          instrument={instrument}
          playlists={playlists}
          chords={chordData}
          customChords={customChords}
        />
      )}

      {mode === "edit" && step === "audio" && (
        // Cambiar de audio borra la sincronización: la clave remonta con el estado nuevo.
        <SongCalibration
          key={audio ? (audio.youtube_id ?? audio.file_path) : "none"}
          song={song}
          audio={audio}
          sync={sync}
          syncMissing={syncMissing}
        />
      )}

      {mode === "karaoke" &&
        (parsed.sections.length > 0 ? (
          <SongKaraoke
            song={song}
            audio={audio}
            sync={sync}
            syncMissing={syncMissing}
            chords={chordData}
            exitHref={songUrl}
            syncHref={`${songUrl}?mode=edit&step=audio`}
            capo={parsed.capo}
            tempo={parsed.tempo}
          />
        ) : (
          emptyState
        ))}
    </div>
  );
}
