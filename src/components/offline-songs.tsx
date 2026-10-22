"use client";

import {
  ChevronLeft,
  CloudCheck,
  Info,
  MonitorPlay,
  Music,
  Play,
  Search,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { parseChordPro } from "@/lib/chordpro";
import type { Instrument } from "@/lib/instruments";
import {
  parseSongsHash,
  setlistOrder,
  songsHash,
  type OfflineChords,
  type OfflinePlaylist,
  type OfflineRoute,
  type OfflineScope,
  type OfflineSong,
} from "@/lib/offline-songs";
import { loadOfflineSongs } from "@/lib/offline-songs-client";
import { keyLabel } from "@/lib/songs";
import { buttonClass } from "./button";
import { ConcertView } from "./concert-view";
import { FIELD_CLASS } from "./playlist-form-modal";
import { SongBook } from "./song-book";
import { SongInstruments } from "./song-instruments";
import { SongKaraoke } from "./song-karaoke";

type Data = {
  songs: OfflineSong[];
  playlists: OfflinePlaylist[];
  chords: OfflineChords;
  scope: OfflineScope;
};

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** En el servidor y al hidratar no hay fragmento: sale el aviso genérico. */
const useHash = () =>
  useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );

/**
 * Canciones sin conexión. La ruta pedida llega en el fragmento (la puso el
 * service worker) y se navega cambiándolo. Sin canciones descargadas o con
 * una ruta que no existe sin conexión, queda el aviso genérico (`children`).
 */
export function OfflineSongs({ children }: { children: ReactNode }) {
  const hash = useHash();
  const target = parseSongsHash(hash);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    loadOfflineSongs().then(setData, () => setData(null));
  }, []);

  // Cada vista empieza arriba, como una página nueva.
  // (Con llaves: en navegadores nuevos scrollTo devuelve una promesa.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);

  if (!target || !data || data.songs.length === 0) return children;
  const { instrument, route } = target;
  const chords = data.chords[instrument] ?? {};

  if (route.view === "song") {
    const song = data.songs.find((s) => s.id === route.id);
    if (!song) return children;
    return route.mode === "karaoke" ? (
      <OfflineKaraoke song={song} instrument={instrument} chords={chords} />
    ) : (
      <OfflineSong song={song} instrument={instrument} chords={chords} />
    );
  }
  if (route.view === "concert") {
    return <OfflineConcert data={data} instrument={instrument} list={route.list} />;
  }
  return <OfflineList data={data} instrument={instrument} list={route.list} />;
}

function useHref() {
  const locale = useLocale();
  return (instrument: Instrument, route: OfflineRoute) =>
    songsHash(locale, instrument, route);
}

/* ---------- lista ---------- */

function OfflineList({
  data,
  instrument,
  list,
}: {
  data: Data;
  instrument: Instrument;
  list: string | null;
}) {
  const t = useTranslations("songs");
  const href = useHref();
  const [search, setSearch] = useState("");

  // Solo las playlists con canciones descargadas.
  const playlists = useMemo(
    () =>
      data.playlists
        .map((p) => ({ ...p, saved: data.songs.filter((s) => s.playlist_id === p.id) }))
        .filter((p) => p.saved.length > 0),
    [data],
  );
  const active = playlists.find((p) => p.id === list) ?? null;
  const listName = new Map(data.playlists.map((p) => [p.id, p.name]));

  const listed = active
    ? setlistOrder(active.saved)
    : [...data.songs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const needle = search.trim().toLowerCase();
  const visible = needle
    ? listed.filter((s) => s.name.toLowerCase().includes(needle))
    : listed;

  // El concierto recorre la playlist entera: solo si están todas sus canciones.
  const complete = active !== null && active.saved.length >= active.songs_count;

  const chip = (selected: boolean) =>
    `inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-semibold ${
      selected ? "yk-gradient border-transparent" : "border-edge-2 bg-surface-2 text-sub"
    }`;

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <div className="mx-auto max-w-[960px] px-5 pb-[90px] pt-8 sm:px-7">
        <h1 className="mb-1 text-[30px] font-extrabold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mb-5 flex items-center gap-2 text-[14px] text-tert">
          <CloudCheck size={15} strokeWidth={2} className="text-accent" />
          {t("offline.savedCount", { count: data.songs.length })}
        </p>

        <nav aria-label={t("offline.playlists")} className="mb-4 flex flex-wrap gap-2">
          <a
            href={href(instrument, { view: "list", list: null })}
            className={chip(!active)}
          >
            {t("all")} <span className="text-xs opacity-75">{data.songs.length}</span>
          </a>
          {playlists.map((p) => (
            <a
              key={p.id}
              href={href(instrument, { view: "list", list: p.id })}
              aria-current={p.id === active?.id ? "page" : undefined}
              className={chip(p.id === active?.id)}
            >
              {p.name} <span className="text-xs opacity-75">{p.saved.length}</span>
            </a>
          ))}
        </nav>

        {active && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-edge bg-surface p-[18px]">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{active.name}</h2>
              <p
                className={`mt-1 flex items-center gap-1.5 text-[12.5px] ${
                  complete ? "text-sub" : "text-warn"
                }`}
              >
                {complete ? (
                  <CloudCheck size={15} strokeWidth={2} className="text-accent" />
                ) : (
                  <Info size={15} strokeWidth={2} />
                )}
                {complete
                  ? t("offline.complete", { count: active.saved.length })
                  : t("offline.incomplete", {
                      saved: active.saved.length,
                      total: active.songs_count,
                    })}
              </p>
            </div>
            {complete ? (
              <a
                href={href(instrument, { view: "concert", list: active.id })}
                className={buttonClass("primary", "sm")}
              >
                <MonitorPlay size={15} strokeWidth={2} />
                {t("setlist.concert")}
              </a>
            ) : (
              <button
                type="button"
                disabled
                title={t("offline.concertNeedsDownload")}
                className={buttonClass("primary", "sm")}
              >
                <MonitorPlay size={15} strokeWidth={2} />
                {t("setlist.concert")}
              </button>
            )}
          </div>
        )}

        <div className="relative mb-4 flex items-center">
          <Search
            size={17}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 text-tert"
          />
          <label htmlFor="offline-song-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <input
            id="offline-song-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`${FIELD_CLASS} h-11 pl-10`}
          />
        </div>

        {visible.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {visible.map((song) => {
              const name =
                !active && song.playlist_id ? listName.get(song.playlist_id) : null;
              return (
                <article
                  key={song.id}
                  className="relative flex items-center gap-3 rounded-[14px] border border-edge bg-surface py-3 pl-[18px] pr-3 hover:border-edge-2"
                >
                  <a
                    href={href(instrument, { view: "song", id: song.id, mode: "view" })}
                    className="absolute inset-0 rounded-[14px]"
                    aria-label={song.name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="truncate text-[15.5px] font-bold">
                        {song.name}
                      </span>
                      {song.key_note && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-edge-2 bg-surface-2 px-2.5 py-[3px] text-[11.5px] font-semibold">
                          <Music size={12} strokeWidth={2} className="text-accent" />
                          {keyLabel(song.key_note)}
                        </span>
                      )}
                      <SongInstruments instruments={song.instruments} size={15} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-tert">
                      {name && <span>{name}</span>}
                      {song.sync && song.sync.stamps.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-[3px] text-[11.5px] font-semibold text-accent">
                          <span className="inline-block size-1.5 rounded-full bg-accent" />
                          {t("statusSynced")}
                        </span>
                      ) : (
                        <span>{t("offline.notSynced")}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={href(instrument, {
                      view: "song",
                      id: song.id,
                      mode: "karaoke",
                    })}
                    aria-label={t("play")}
                    title={t("play")}
                    className="yk-gradient relative z-10 grid size-11 shrink-0 place-items-center rounded-xl shadow-fab"
                  >
                    <Play
                      size={19}
                      fill="currentColor"
                      strokeWidth={0}
                      className="ml-0.5"
                    />
                  </a>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-12 text-center text-[14px] text-tert">
            {t("noResults", { query: search.trim() })}
          </p>
        )}
        <p className="mt-6 text-center text-[12.5px] text-tert">
          {t("offline.listNote")}
        </p>
      </div>
    </main>
  );
}

/* ---------- canción (modo libro) ---------- */

function OfflineSong({
  song,
  instrument,
  chords,
}: {
  song: OfflineSong;
  instrument: Instrument;
  chords: OfflineChords[Instrument];
}) {
  const t = useTranslations("songView");
  const href = useHref();
  const parsed = useMemo(() => parseChordPro(song.content), [song.content]);
  const pill =
    "inline-flex items-center gap-[7px] rounded-full border border-edge-2 bg-surface-2 px-3 py-[5px] text-[12.5px] font-semibold";

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <div className="mx-auto max-w-[1600px] px-5 pb-[100px] pt-6 has-[[data-book]]:flex has-[[data-book]]:h-[calc(100dvh-72px)] has-[[data-book]]:flex-col has-[[data-book]]:pb-4">
        <nav aria-label={t("breadcrumb")} className="mb-6 text-[13px] text-tert">
          <a
            href={href(instrument, { view: "list", list: null })}
            className="inline-flex items-center gap-2 hover:text-ink"
          >
            <ChevronLeft size={15} strokeWidth={2} />
            {t("backToSongs")}
          </a>
        </nav>
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
                <span className={`${pill} text-sub`}>
                  <Music size={13} strokeWidth={2} className="text-accent" />
                  {t("keyPrefix")}{" "}
                  <span className="text-ink">{keyLabel(song.key_note)}</span>
                </span>
              )}
              {parsed.capo && (
                <span className={`${pill} text-ink`}>
                  {t("capo", { n: parsed.capo })}
                </span>
              )}
              {parsed.tempo && (
                <span className={`${pill} text-ink`}>
                  <span className="text-accent">♩</span>
                  {t("tempo", { bpm: parsed.tempo })}
                </span>
              )}
              <SongInstruments instruments={song.instruments} />
            </div>
          </div>
          {parsed.sections.length > 0 && (
            <a
              href={href(instrument, { view: "song", id: song.id, mode: "karaoke" })}
              className={`${buttonClass("primary", "lg")} shadow-fab`}
            >
              <Play size={17} fill="currentColor" strokeWidth={0} />
              {t("play")}
            </a>
          )}
        </div>
        {parsed.sections.length > 0 ? (
          <SongBook songId={song.id} sections={parsed.sections} chords={chords} />
        ) : (
          <p className="py-12 text-center text-sm text-tert">{t("emptyTitle")}</p>
        )}
      </div>
    </main>
  );
}

/* ---------- karaoke sin audio ---------- */

function OfflineKaraoke({
  song,
  instrument,
  chords,
}: {
  song: OfflineSong;
  instrument: Instrument;
  chords: OfflineChords[Instrument];
}) {
  const href = useHref();
  const parsed = useMemo(() => parseChordPro(song.content), [song.content]);
  const exitHref = href(instrument, { view: "song", id: song.id, mode: "view" });
  if (parsed.sections.length === 0) {
    return <OfflineSong song={song} instrument={instrument} chords={chords} />;
  }
  return (
    <SongKaraoke
      song={song}
      audio={
        song.audio && {
          song_id: song.id,
          source: song.audio.source,
          youtube_id: null,
          youtube_title: null,
          file_path: null,
        }
      }
      sync={song.sync}
      syncMissing={song.syncMissing}
      chords={chords}
      exitHref={exitHref}
      syncHref={null}
      capo={parsed.capo}
      tempo={parsed.tempo}
      silent
    />
  );
}

/* ---------- concierto ---------- */

function OfflineConcert({
  data,
  instrument,
  list,
}: {
  data: Data;
  instrument: Instrument;
  list: string;
}) {
  const href = useHref();
  const playlist = data.playlists.find((p) => p.id === list);
  const songs = useMemo(
    () =>
      setlistOrder(data.songs.filter((s) => s.playlist_id === list)).map((s) => {
        const parsed = parseChordPro(s.content);
        return {
          id: s.id,
          name: s.name,
          keyNote: s.key_note,
          capo: parsed.capo,
          tempo: parsed.tempo,
          sections: parsed.sections,
        };
      }),
    [data.songs, list],
  );
  const covered = playlist && songs.length >= playlist.songs_count;

  const exitHref = href(instrument, { view: "list", list });
  if (!playlist || !covered || songs.length === 0) {
    return <OfflineList data={data} instrument={instrument} list={list} />;
  }
  return (
    <ConcertView
      playlistName={playlist.name}
      songs={songs}
      chords={data.chords[instrument] ?? {}}
      exitHref={exitHref}
    />
  );
}
