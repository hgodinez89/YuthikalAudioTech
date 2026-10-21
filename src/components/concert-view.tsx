"use client";

import {
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Maximize,
  Minimize,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { ChordSheet, type ChordDataMap } from "./chord-sheet";
import { Menu, MenuItem } from "./menu";
import { BookView } from "./song-book";
import type { SheetSection } from "@/lib/chordpro";
import { keyLabel } from "@/lib/songs";

export type ConcertSong = {
  id: string;
  name: string;
  keyNote: string;
  /** {capo:} y {tempo:} de la letra: dónde va la cejilla y el pulso, a la vista. */
  capo: number | null;
  tempo: number | null;
  sections: SheetSection[];
};

/* Modo libro solo donde hay espacio para páginas a lo alto (como en la canción). */
const BOOK_QUERY = "(min-width: 768px) and (min-height: 560px)";
function subscribeMedia(onChange: () => void) {
  const mql = window.matchMedia(BOOK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Modo concierto: el setlist entero en una sola pantalla. Al pasar de la
 * última página de una canción se abre la siguiente (y de la primera, la
 * anterior en su última página), así la pantalla completa y la pantalla
 * siempre encendida no se cortan entre canciones. Funciona con flechas,
 * Av Pág/Re Pág y pedales Bluetooth.
 */
export function ConcertView({
  playlistName,
  songs,
  chords,
  exitHref,
}: {
  playlistName: string;
  songs: ConcertSong[];
  chords: ChordDataMap;
  exitHref: string;
}) {
  const t = useTranslations("concert");
  const tSongView = useTranslations("songView");
  const router = useRouter();
  const canBook = useSyncExternalStore(
    subscribeMedia,
    () => window.matchMedia(BOOK_QUERY).matches,
    () => false,
  );
  const [current, setCurrent] = useState({ index: 0, atEnd: false });
  const [fullscreen, setFullscreen] = useState(false);
  const song = songs[current.index];
  const next = songs[current.index + 1];
  const last = current.index === songs.length - 1;

  const goTo = (index: number, atEnd = false) => {
    if (index < 0 || index >= songs.length) return;
    setCurrent({ index, atEnd });
    // En continuo (celular), la canción nueva empieza arriba.
    window.scrollTo({ top: 0 });
  };
  const step = (direction: 1 | -1) => goTo(current.index + direction, direction === -1);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* Teclas propias del concierto; el paso de páginas lo maneja el libro. */
  const keys = useRef({
    step,
    toggleFullscreen,
    canBook,
    exit: () => router.push(exitHref),
  });
  useLayoutEffect(() => {
    keys.current = { step, toggleFullscreen, canBook, exit: () => router.push(exitHref) };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true'], [role='menu']")
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        k.toggleFullscreen();
      } else if (e.key === "Escape" && !document.fullscreenElement) {
        k.exit();
      } else if (!k.canBook && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        // En continuo (sin páginas), las flechas cambian de canción.
        e.preventDefault();
        k.step(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Pantalla siempre encendida durante todo el concierto. */
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      lock?.release().catch(() => {});
    };
  }, []);

  const navButton =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-[11px] border border-edge-2 bg-surface-2 text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page text-ink">
      {/* CABECERA: lugar en el setlist, siguiente, índice y salir */}
      <header className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-2.5 sm:px-5">
        <Link
          href={exitHref}
          aria-label={t("exit")}
          title={`${t("exit")} (Esc)`}
          className="grid size-11 shrink-0 place-items-center rounded-[11px] border border-edge bg-surface-3 text-sub hover:text-ink"
        >
          <X size={19} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="flex items-baseline gap-2.5">
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-accent">
              {t("position", { n: current.index + 1, total: songs.length })}
            </span>
            <h1 className="truncate text-[17px] font-extrabold">{song.name}</h1>
            {(song.keyNote || song.capo || song.tempo) && (
              <span className="hidden shrink-0 text-[13px] text-tert sm:inline">
                {[
                  song.keyNote && keyLabel(song.keyNote),
                  song.capo && tSongView("capo", { n: song.capo }),
                  song.tempo && `♩ ${tSongView("tempo", { bpm: song.tempo })}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
          <div className="truncate text-[12.5px] text-tert">
            {next
              ? t("next", { name: next.name })
              : t("lastSong", { playlist: playlistName })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={current.index === 0}
          aria-label={t("previousSong")}
          title={t("previousSong")}
          className={navButton}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={last}
          aria-label={t("nextSong")}
          title={t("nextSong")}
          className={navButton}
        >
          <ChevronRight size={20} strokeWidth={2.2} />
        </button>
        <Menu
          label={t("index")}
          trigger={{
            "aria-label": t("index"),
            title: t("index"),
            className: navButton,
            children: <ListMusic size={19} strokeWidth={2} />,
          }}
          panelClassName="absolute right-0 top-[52px] z-[60] max-h-[70vh] w-[280px] overflow-y-auto rounded-[14px] border border-edge-2 bg-surface p-1.5 shadow-pop"
        >
          {songs.map((s, i) => (
            <MenuItem
              key={s.id}
              checked={i === current.index}
              onSelect={() => goTo(i)}
              className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] ${
                i === current.index ? "bg-accent/10 font-bold text-accent" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-right text-[12.5px] tabular-nums text-tert">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
            </MenuItem>
          ))}
        </Menu>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
          title={`${fullscreen ? t("exitFullscreen") : t("fullscreen")} (F)`}
          className="yk-gradient hidden size-11 shrink-0 cursor-pointer place-items-center rounded-[11px] sm:grid"
        >
          {fullscreen ? (
            <Minimize size={18} strokeWidth={2.2} />
          ) : (
            <Maximize size={18} strokeWidth={2.2} />
          )}
        </button>
      </header>

      {/* CANCIÓN ACTUAL */}
      {/* (div: el layout del instrumento ya pone el <main>) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:px-6">
        {song.sections.length === 0 ? (
          <p className="m-auto text-center text-tert">{t("empty")}</p>
        ) : canBook ? (
          <BookView
            // Una canción, un libro: cambia de páginas, zoom y medidas.
            key={`${song.id}:${current.atEnd}`}
            songId={song.id}
            sections={song.sections}
            chords={chords}
            onBeyond={step}
            startAtEnd={current.atEnd}
          />
        ) : (
          <div key={song.id} className="mx-auto w-full max-w-[860px] pb-24">
            <ChordSheet sections={song.sections} chords={chords} showFab={false} />
            {next && (
              <button
                type="button"
                onClick={() => step(1)}
                className="mt-8 flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-edge-2 bg-surface px-4 py-3.5 text-left hover:border-accent"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-tert">
                    {t("nextSong")}
                  </span>
                  <span className="block truncate font-bold">{next.name}</span>
                </span>
                <ChevronRight
                  size={20}
                  strokeWidth={2.2}
                  className="shrink-0 text-accent"
                />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
