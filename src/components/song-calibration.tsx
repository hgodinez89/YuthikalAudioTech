"use client";

import {
  Check,
  FileMusic,
  Link2,
  Music,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  Upload,
} from "lucide-react";
/* eslint-disable @next/next/no-img-element -- miniatura externa de YouTube */
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import {
  formatStamp,
  formatTime,
  MAX_MP3_BYTES,
  type SongAudioRow,
  type SongSyncRow,
  type SyncStamp,
} from "@/lib/audio";
import { saveSync, setFileAudio, setYouTubeAudio } from "@/lib/audio-actions";
import { buildVisualModel, type SectionType } from "@/lib/chordpro";
import type { SongRow } from "@/lib/songs";
import { supabaseBrowser } from "@/lib/supabase";
import { useAudioEngine, type AudioSource } from "@/lib/use-audio-engine";
import { youtubeThumbnail } from "@/lib/youtube";

type Row =
  | { kind: "section"; title: string }
  | { kind: "line"; words: string[]; firstTarget: number; targetCount: number };

/** Filas de la hoja + total de objetivos según granularidad. */
function buildRows(
  content: string,
  granularity: "line" | "word",
  sectionTitle: (
    type: SectionType,
    number: number,
    label: string | null,
  ) => string | null,
): { rows: Row[]; totalTargets: number } {
  const rows: Row[] = [];
  let target = 0;
  for (const section of buildVisualModel(content)) {
    const title = sectionTitle(section.type, section.number, section.label);
    if (title) rows.push({ kind: "section", title });
    for (const line of section.lines) {
      const words = line.units.map((u) => u.text).filter(Boolean);
      const targetCount = granularity === "line" ? 1 : Math.max(words.length, 1);
      rows.push({ kind: "line", words, firstTarget: target, targetCount });
      target += targetCount;
    }
  }
  return { rows, totalTargets: target };
}

export function SongCalibration({
  song,
  audio,
  sync,
}: {
  song: SongRow;
  audio: SongAudioRow | null;
  sync: SongSyncRow | null;
}) {
  const t = useTranslations("calibration");
  const tSongView = useTranslations("songView");
  const router = useRouter();

  const [sourceTab, setSourceTab] = useState<"youtube" | "file">(
    audio?.source ?? "youtube",
  );
  const [urlInput, setUrlInput] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<"line" | "word">(
    sync?.granularity ?? "line",
  );
  const [stamps, setStamps] = useState<Map<number, number>>(
    () => new Map((sync?.stamps ?? []).map((s) => [s.i, s.t])),
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [confirm, setConfirm] = useState<"reset" | "granularity" | null>(null);
  const pendingGranularity = useRef<"line" | "word">("line");

  const sectionTitle = useCallback(
    (type: SectionType, number: number, label: string | null) => {
      if (label) return label;
      if (type === "plain") return null;
      const base = tSongView(type);
      if (type === "verse") return `${base} ${number}`;
      return number > 1 ? `${base} ${number}` : base;
    },
    [tSongView],
  );

  const { rows, totalTargets } = useMemo(
    () => buildRows(song.content, granularity, sectionTitle),
    [song.content, granularity, sectionTitle],
  );

  /* Cursor: primer objetivo sin marcar. */
  const [cursor, setCursor] = useState(() => {
    let i = 0;
    while (stamps.has(i)) i++;
    return i;
  });

  /* URL firmada del MP3 (bucket privado). */
  useEffect(() => {
    if (audio?.source !== "file" || !audio.file_path) return;
    let cancelled = false;
    supabaseBrowser()
      .storage.from("audio")
      .createSignedUrl(audio.file_path, 3600)
      .then(({ data }) => {
        if (!cancelled && data) setFileUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [audio?.source, audio?.file_path]);

  const engineSource: AudioSource | null =
    audio?.source === "youtube" && audio.youtube_id
      ? { type: "youtube", videoId: audio.youtube_id }
      : audio?.source === "file" && fileUrl
        ? { type: "file", url: fileUrl }
        : null;

  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const engine = useAudioEngine(engineSource, youtubeContainerRef);

  /* Autosave de timestamps (debounce). */
  const dirtyRef = useRef(false);
  useEffect(() => {
    if (!dirtyRef.current) return;
    const timer = setTimeout(async () => {
      setSaveState("saving");
      const list: SyncStamp[] = [...stamps.entries()]
        .map(([i, tt]) => ({ i, t: tt }))
        .sort((a, b) => a.i - b.i);
      const result = await saveSync(song.id, granularity, list);
      setSaveState(result.ok ? "saved" : "error");
      if (result.ok) router.refresh();
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamps, granularity, song.id]);

  const mark = () => {
    if (!engine.ready || cursor >= totalTargets) return;
    const time = Math.round(engine.now() * 10) / 10;
    dirtyRef.current = true;
    setStamps((prev) => new Map(prev).set(cursor, time));
    setCursor((c) => Math.min(c + 1, totalTargets));
  };

  /* Barra espaciadora = marcar (fuera de inputs). El listener se suscribe
     una sola vez y lee la versión vigente de mark vía ref. */
  const markRef = useRef(mark);
  useEffect(() => {
    markRef.current = mark;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.code !== "Space" || tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      markRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remarkLine = (row: Extract<Row, { kind: "line" }>) => {
    dirtyRef.current = true;
    setStamps((prev) => {
      const next = new Map(prev);
      for (let i = 0; i < row.targetCount; i++) next.delete(row.firstTarget + i);
      return next;
    });
    setCursor(row.firstTarget);
  };

  const applyReset = () => {
    dirtyRef.current = true;
    setStamps(new Map());
    setCursor(0);
    engine.seekTo(0);
    setConfirm(null);
  };

  const requestGranularity = (value: "line" | "word") => {
    if (value === granularity) return;
    if (stamps.size > 0) {
      pendingGranularity.current = value;
      setConfirm("granularity");
      return;
    }
    setGranularity(value);
    setCursor(0);
  };

  const connectYouTube = async () => {
    setConnecting(true);
    setSourceError(null);
    const result = await setYouTubeAudio(song.id, urlInput);
    setConnecting(false);
    if (!result.ok) {
      setSourceError(t(`errors.${result.error}`));
      return;
    }
    setUrlInput("");
    router.refresh();
  };

  const uploadFile = async (file: File) => {
    setSourceError(null);
    if (file.type !== "audio/mpeg") {
      setSourceError(t("errors.fileType"));
      return;
    }
    if (file.size > MAX_MP3_BYTES) {
      setSourceError(t("errors.fileSize"));
      return;
    }
    setUploading(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      setSourceError(t("errors.auth"));
      return;
    }
    const path = `${user.id}/${song.id}.mp3`;
    const { error } = await supabase.storage
      .from("audio")
      .upload(path, file, { upsert: true, contentType: "audio/mpeg" });
    if (error) {
      setUploading(false);
      setSourceError(t("errors.upload"));
      return;
    }
    const result = await setFileAudio(song.id, path);
    setUploading(false);
    if (!result.ok) {
      setSourceError(t(`errors.${result.error}`));
      return;
    }
    setFileUrl(null); // se regenerará la URL firmada
    router.refresh();
  };

  /* Progreso para la fila actual en modo palabra. */
  const cursorInRow = (row: Extract<Row, { kind: "line" }>) =>
    cursor >= row.firstTarget && cursor < row.firstTarget + row.targetCount;
  const rowDone = (row: Extract<Row, { kind: "line" }>) => {
    for (let i = 0; i < row.targetCount; i++) {
      if (!stamps.has(row.firstTarget + i)) return false;
    }
    return true;
  };

  const markNumber = Math.min(cursor + 1, totalTargets);
  const progressFrac = engine.duration ? engine.currentTime / engine.duration : 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      {/* contenedor oculto del player de YouTube */}
      <div
        ref={youtubeContainerRef}
        className="pointer-events-none fixed -left-[9999px] top-0 size-px overflow-hidden"
        aria-hidden
      />

      {/* ASIDE IZQUIERDO */}
      <aside className="flex flex-col gap-[18px] lg:sticky lg:top-[90px]">
        {/* FUENTE DE AUDIO */}
        <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
          <div className="border-b border-edge px-4 py-3.5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
              {t("sourceTitle")}
            </span>
          </div>
          <div className="p-4">
            <div className="mb-3.5 flex rounded-[10px] border border-edge bg-surface-3 p-1 text-[13px] font-semibold">
              {(["youtube", "file"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSourceTab(tab)}
                  className={
                    sourceTab === tab
                      ? "yk-gradient flex-1 cursor-pointer rounded-lg py-[7px]"
                      : "flex-1 cursor-pointer rounded-lg py-[7px] text-sub"
                  }
                >
                  {tab === "youtube" ? "YouTube" : t("fileTab")}
                </button>
              ))}
            </div>

            {sourceTab === "youtube" && (
              <div>
                <div className="relative mb-3 flex items-center">
                  <Link2
                    size={15}
                    strokeWidth={2}
                    className="absolute left-3 text-mute"
                  />
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && connectYouTube()}
                    placeholder={t("urlPlaceholder")}
                    className="h-10 w-full rounded-[10px] border border-edge bg-surface-2 pl-9 pr-20 text-[13px] text-ink outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={connectYouTube}
                    disabled={connecting || !urlInput.trim()}
                    className="yk-gradient absolute right-1.5 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    {connecting ? "…" : t("connect")}
                  </button>
                </div>
                {audio?.source === "youtube" && audio.youtube_id && (
                  <div className="flex gap-3 rounded-xl border border-edge-2 bg-surface-2 p-2.5">
                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-3">
                      <img
                        src={youtubeThumbnail(audio.youtube_id)}
                        alt=""
                        className="size-full object-cover"
                      />
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="grid size-[26px] place-items-center rounded-full bg-page/70">
                          <Play size={12} fill="#fff" strokeWidth={0} className="ml-px" />
                        </span>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col justify-center">
                      <div className="mb-[3px] flex items-center gap-1.5 text-[10.5px] font-bold text-accent">
                        <span className="size-1.5 rounded-full bg-accent" />
                        {t("connected")}
                      </div>
                      <div className="line-clamp-2 text-[13px] font-semibold leading-[1.25]">
                        {audio.youtube_title ?? audio.youtube_id}
                      </div>
                      {engine.duration > 0 && (
                        <div className="mt-0.5 text-[11.5px] text-tert">
                          {formatTime(engine.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sourceTab === "file" && (
              <div>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) void uploadFile(file);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-edge-2 bg-surface-2 px-4 py-7 text-center hover:border-accent"
                >
                  <input
                    type="file"
                    accept="audio/mpeg,.mp3"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadFile(file);
                    }}
                  />
                  <Upload size={28} strokeWidth={1.8} className="text-accent" />
                  <div className="text-[13.5px] font-semibold">
                    {uploading ? t("uploading") : t("dropTitle")}
                  </div>
                  <div className="text-xs text-tert">{t("dropHint")}</div>
                </label>
                {audio?.source === "file" && audio.file_path && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-edge-2 bg-surface-2 p-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                      <FileMusic size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-[3px] flex items-center gap-1.5 text-[10.5px] font-bold text-accent">
                        <span className="size-1.5 rounded-full bg-accent" />
                        {t("connected")}
                      </div>
                      <div className="truncate text-[13px] font-semibold">
                        {audio.file_path.split("/").pop()}
                      </div>
                      {engine.duration > 0 && (
                        <div className="mt-0.5 text-[11.5px] text-tert">
                          {formatTime(engine.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sourceError && (
              <p className="mt-3 text-[12.5px] font-semibold text-warn">{sourceError}</p>
            )}
          </div>
        </div>

        {/* GRANULARIDAD */}
        <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
          <div className="border-b border-edge px-4 py-3.5">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
              {t("granularityTitle")}
            </span>
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            {(["line", "word"] as const).map((value) => {
              const active = granularity === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => requestGranularity(value)}
                  className={`flex w-full cursor-pointer items-start gap-[11px] rounded-xl border p-3 text-left ${
                    active
                      ? "border-accent/40 bg-accent/[0.07]"
                      : "border-edge bg-surface-2"
                  }`}
                >
                  <span
                    className={`mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-accent" : "border-disabled"
                    }`}
                  >
                    {active && <span className="size-2 rounded-full bg-accent" />}
                  </span>
                  <span>
                    <span className="block text-[13.5px] font-bold">
                      {t(`granularity.${value}`)}
                    </span>
                    <span className="mt-0.5 block text-xs text-sub">
                      {t(`granularity.${value}Hint`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* HOJA DE CALIBRACIÓN */}
      <main>
        <button
          type="button"
          onClick={mark}
          disabled={!engine.ready}
          className="mb-2.5 flex w-full cursor-pointer items-center justify-center gap-3.5 rounded-2xl border-[1.5px] border-accent/40 bg-[linear-gradient(135deg,rgba(46,107,240,0.16),rgba(53,214,232,0.16))] p-[22px] transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-page/40 text-accent">
            <Music size={22} strokeWidth={2} />
          </span>
          <span className="text-left">
            <span className="block font-bold">
              {t.rich("tapTitle", {
                kbd: (chunks) => (
                  <kbd className="rounded-md border border-edge-2 bg-surface-3 px-2 py-0.5 text-[13px] font-bold text-accent">
                    {chunks}
                  </kbd>
                ),
              })}
            </span>
            <span className="mt-[3px] block text-[12.5px] text-sub">
              {engine.ready
                ? t("tapProgress", {
                    n: markNumber,
                    total: totalTargets,
                    granularity: t(`granularityShort.${granularity}`),
                  })
                : t("tapNeedsAudio")}
            </span>
          </span>
        </button>

        {/* estado de guardado */}
        <div className="mb-3 flex justify-end text-[12px] font-semibold">
          {saveState === "saving" && <span className="text-sub">{t("saving")}</span>}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1 text-accent">
              <Check size={13} strokeWidth={2.5} /> {t("saved")}
            </span>
          )}
          {saveState === "error" && (
            <span className="inline-flex items-center gap-1 text-warn">
              <TriangleAlert size={13} strokeWidth={2} /> {t("saveError")}
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-edge bg-surface px-2 py-2.5">
          {rows.map((row, ri) => {
            if (row.kind === "section") {
              return (
                <div key={ri} className="flex items-center gap-3 px-3.5 py-[11px]">
                  <span className="w-[74px] shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-sub">
                    {row.title}
                  </span>
                </div>
              );
            }
            const done = rowDone(row);
            const isCurrent = cursorInRow(row);
            const firstStamp = stamps.get(row.firstTarget);
            const markedInRow = Array.from(
              { length: row.targetCount },
              (_, i) => row.firstTarget + i,
            ).filter((i) => stamps.has(i)).length;

            return (
              <div
                key={ri}
                className={`my-0.5 flex items-center gap-3 rounded-[10px] border-l-[3px] px-3.5 py-[11px] ${
                  isCurrent ? "border-l-accent bg-accent/[0.08]" : "border-l-transparent"
                }`}
              >
                <div className="flex w-[74px] shrink-0 items-center gap-[7px]">
                  {done ? (
                    <span className="inline-flex items-center gap-[5px]">
                      <Check size={15} strokeWidth={2.6} className="text-accent" />
                      {firstStamp !== undefined && (
                        <span className="text-[11.5px] font-semibold tabular-nums text-accent">
                          {formatStamp(firstStamp)}
                        </span>
                      )}
                    </span>
                  ) : isCurrent ? (
                    <span className="rounded-full border border-accent/40 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                      {t("now")}
                    </span>
                  ) : (
                    <span className="ml-1 size-[9px] rounded-full border-[1.5px] border-edge-2" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {granularity === "line" ? (
                    <span
                      className={
                        isCurrent
                          ? "text-[17px] font-bold text-ink"
                          : done
                            ? "text-mute"
                            : "text-sub"
                      }
                    >
                      {row.words.join(" ")}
                    </span>
                  ) : (
                    <span className="flex flex-wrap gap-x-[0.4em]">
                      {row.words.map((word, wi) => {
                        const targetIndex = row.firstTarget + wi;
                        const wordDone = stamps.has(targetIndex);
                        const wordCurrent = targetIndex === cursor;
                        return (
                          <span
                            key={wi}
                            className={
                              wordCurrent
                                ? "rounded bg-accent/20 px-1 font-bold text-ink"
                                : wordDone
                                  ? "text-mute underline decoration-accent/50 underline-offset-4"
                                  : isCurrent
                                    ? "text-sub"
                                    : "text-sub"
                            }
                          >
                            {word}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {granularity === "word" && row.targetCount > 1 && (
                    <span className="ml-2 text-[11px] tabular-nums text-tert">
                      {markedInRow}/{row.targetCount}
                    </span>
                  )}
                </div>
                {(done || markedInRow > 0) && (
                  <button
                    type="button"
                    onClick={() => remarkLine(row)}
                    title={t("remark")}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-accent"
                  >
                    <RotateCcw size={16} strokeWidth={2} />
                  </button>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-tert">{t("noContent")}</p>
          )}
        </div>
      </main>

      {/* TRANSPORTE */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-page/95 backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-[18px] px-7 py-3.5">
          <button
            type="button"
            onClick={engine.toggle}
            disabled={!engine.ready}
            aria-label={engine.playing ? t("pause") : t("play")}
            className="yk-gradient grid size-[46px] shrink-0 cursor-pointer place-items-center rounded-full shadow-[0_4px_18px_rgba(46,107,240,0.35)] disabled:opacity-50"
          >
            {engine.playing ? (
              <Pause size={18} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={18} fill="currentColor" strokeWidth={0} className="ml-0.5" />
            )}
          </button>
          <span className="shrink-0 text-[12.5px] tabular-nums text-sub">
            {formatTime(engine.currentTime)}
          </span>
          <div
            onClick={(e) => {
              if (!engine.duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              engine.seekTo(((e.clientX - rect.left) / rect.width) * engine.duration);
            }}
            className="flex h-[34px] flex-1 cursor-pointer items-center gap-[2.5px]"
          >
            {Array.from({ length: 64 }, (_, i) => {
              const h = 6 + Math.abs(Math.sin(i * 0.5)) * 20 + (i % 3) * 2;
              const on = i / 64 <= progressFrac;
              return (
                <span
                  key={i}
                  className="min-w-[2px] flex-1 rounded-[2px]"
                  style={{
                    height: Math.round(h),
                    background: on
                      ? "linear-gradient(180deg, var(--grad-to), var(--grad-from))"
                      : "var(--edge)",
                  }}
                />
              );
            })}
          </div>
          <span className="shrink-0 text-[12.5px] tabular-nums text-tert">
            {formatTime(engine.duration)}
          </span>
          <button
            type="button"
            onClick={() => setConfirm("reset")}
            disabled={stamps.size === 0}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-[11px] border border-edge-2 bg-surface-2 px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            <RotateCcw size={15} strokeWidth={2} />
            {t("reset")}
          </button>
        </div>
      </div>

      {/* CONFIRMACIONES */}
      <ConfirmDialog
        open={confirm === "reset"}
        title={t("resetTitle")}
        message={t("resetMessage", { count: stamps.size })}
        cancelLabel={t("cancel")}
        confirmLabel={t("resetConfirm")}
        confirmIcon={<RotateCcw size={15} strokeWidth={2.2} />}
        onCancel={() => setConfirm(null)}
        onConfirm={applyReset}
      />
      <ConfirmDialog
        open={confirm === "granularity"}
        title={t("granularityChangeTitle")}
        message={t("granularityChangeMessage")}
        cancelLabel={t("cancel")}
        confirmLabel={t("granularityChangeConfirm")}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          dirtyRef.current = true;
          setStamps(new Map());
          setGranularity(pendingGranularity.current);
          setCursor(0);
          setConfirm(null);
        }}
      />
    </div>
  );
}
