"use client";

import { Check, Flag, History, Music, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioSourcePanel } from "./audio-source-panel";
import { CalibrationTransport, RATES, SKIP_SECONDS } from "./calibration-transport";
import { ConfirmDialog } from "./confirm-dialog";
import { FloatingVideo } from "./floating-video";
import {
  formatStamp,
  formatTime,
  nextUnmarked,
  REVIEW_PREROLL,
  resumePoint,
  reviewStart,
  stepRate,
  type SongAudioRow,
  type SongSyncRow,
} from "@/lib/audio";
import { saveSync } from "@/lib/audio-actions";
import { smoothBehavior } from "@/lib/motion";
import type { SongRow } from "@/lib/songs";
import { calibrationRows, type CalibrationRow } from "@/lib/sync-lines";
import { useAudioEngine, type AudioSource } from "@/lib/use-audio-engine";
import { useAutosave } from "@/lib/use-autosave";
import { usePlayerShortcuts } from "@/lib/use-player-shortcuts";
import { useSectionTitle } from "@/lib/use-section-title";
import { useSignedAudioUrl } from "@/lib/use-signed-audio-url";
import { useStoredFlag } from "@/lib/use-stored-flag";

/* Alto del header del sitio (sticky): límite superior de la zona visible. */
const HEADER_HEIGHT = 72;

type LineRow = Extract<CalibrationRow, { kind: "line" }>;

/**
 * Una fila de la hoja de sincronización. Memorizada: el reloj del audio cambia
 * varias veces por segundo pero las filas solo se redibujan al marcar.
 */
const CalibrationLineView = memo(function CalibrationLineView({
  row,
  granularity,
  stamps,
  cursor,
  onRemark,
}: {
  row: LineRow;
  granularity: "line" | "word";
  stamps: Map<number, number>;
  cursor: number;
  onRemark: (row: LineRow) => void;
}) {
  const t = useTranslations("calibration");
  const isCurrent =
    cursor >= row.firstTarget && cursor < row.firstTarget + row.targetCount;
  let markedInRow = 0;
  for (let i = 0; i < row.targetCount; i++)
    if (stamps.has(row.firstTarget + i)) markedInRow++;
  const done = markedInRow === row.targetCount;
  const firstStamp = stamps.get(row.firstTarget);

  return (
    <div
      data-current={isCurrent || undefined}
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
            {row.words
              .map((w) => (w.spaceAfter ? `${w.text} ` : w.text))
              .join("")
              .trimEnd()}
          </span>
        ) : (
          // Flujo inline con espacios reales: los trozos de una misma
          // palabra quedan pegados y no se separan al hacer salto de línea.
          <span className="leading-relaxed">
            {row.words.map((word, wi) => {
              const targetIndex = row.firstTarget + wi;
              const wordDone = stamps.has(targetIndex);
              const wordCurrent = targetIndex === cursor;
              return (
                <Fragment key={wi}>
                  <span
                    className={
                      wordCurrent
                        ? "rounded bg-accent/20 px-1 font-bold text-ink"
                        : wordDone
                          ? "text-mute underline decoration-accent/50 underline-offset-4"
                          : "text-sub"
                    }
                  >
                    {word.text}
                  </span>
                  {word.spaceAfter && " "}
                </Fragment>
              );
            })}
          </span>
        )}
        {row.pass && (
          <span className="ml-2 rounded-md border border-accent/35 bg-accent/10 px-1.5 py-px text-[11px] font-bold tabular-nums text-accent">
            {t("pass", { n: row.pass.n, total: row.pass.total })}
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
          onClick={() => onRemark(row)}
          title={t("remark")}
          aria-label={t("remark")}
          className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-accent"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
});

export function SongCalibration({
  song,
  audio,
  sync,
  syncMissing = 0,
}: {
  song: SongRow;
  audio: SongAudioRow | null;
  sync: SongSyncRow | null;
  /** Objetivos nuevos sin marca: la letra cambió después de sincronizar. */
  syncMissing?: number;
}) {
  const t = useTranslations("calibration");
  const sectionTitle = useSectionTitle();

  const [granularity, setGranularity] = useState<"line" | "word">(
    sync?.granularity ?? "line",
  );
  const [stamps, setStamps] = useState<Map<number, number>>(
    () => new Map((sync?.stamps ?? []).map((s) => [s.i, s.t])),
  );
  /* Fin opcional: el karaoke termina ahí; sin él, suena hasta el final. */
  const [endAt, setEndAt] = useState<number | null>(sync?.end_at ?? null);
  const [confirm, setConfirm] = useState<"reset" | "granularity" | null>(null);
  const pendingGranularity = useRef<"line" | "word">("line");

  const { rows, totalTargets } = useMemo(
    () => calibrationRows(song.content, granularity, sectionTitle),
    [song.content, granularity, sectionTitle],
  );

  /* Cursor: primer objetivo sin marcar. */
  const [cursor, setCursor] = useState(() => {
    let i = 0;
    while (stamps.has(i)) i++;
    return i;
  });

  /* "Sin fin" (sonar hasta el final del audio) es un estado válido y no se
     persiste: al entrar con todo marcado y sin fin, ya está resuelto. */
  const [endSkipped, setEndSkipped] = useState(
    () => endAt === null && totalTargets > 0 && cursor >= totalTargets,
  );

  /* Retomar a medias: el audio arranca (pausado) en el inicio de la última
     línea marcada. Solo con la fuente que había al entrar. */
  const [resume] = useState(() => {
    const lines = rows.flatMap((r) => (r.kind === "line" ? [r] : []));
    const at = resumePoint(stamps, cursor, lines, totalTargets);
    const sourceId = audio?.source === "youtube" ? audio.youtube_id : audio?.file_path;
    return at === null || !sourceId ? null : { at, sourceId };
  });
  const [showResume, setShowResume] = useState(resume !== null);

  /* URL firmada del MP3 (bucket privado), renovada antes de vencer. */
  const filePath = audio?.source === "file" ? audio.file_path : null;
  const signed = useSignedAudioUrl(filePath);

  const startFor = (sourceId: string | null | undefined) =>
    resume && resume.sourceId === sourceId ? resume.at : undefined;
  const engineSource: AudioSource | null =
    audio?.source === "youtube" && audio.youtube_id
      ? { type: "youtube", videoId: audio.youtube_id, start: startFor(audio.youtube_id) }
      : filePath && signed.url
        ? { type: "file", url: signed.url, id: filePath, start: startFor(filePath) }
        : null;

  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const engine = useAudioEngine(engineSource, youtubeContainerRef);
  const hasVideo = engineSource?.type === "youtube";

  /* Video flotante: se recuerda si quedó abierto; aquí se reabre solo al pasar
     a reproducir (detectado durante el render comparando con el estado anterior). */
  const [videoOpen, setVideoOpen] = useStoredFlag("yk-video-open:calibration", true);
  const [wasPlaying, setWasPlaying] = useState(engine.playing);
  if (engine.playing !== wasPlaying) {
    setWasPlaying(engine.playing);
    if (engine.playing && !videoOpen) setVideoOpen(true);
    if (engine.playing) setShowResume(false);
  }
  const toggleVideo = () => setVideoOpen(!videoOpen);

  /* Scroll automático: la línea actual se mantiene en una zona cómoda entre
     el header y la barra de transporte, mostrando las líneas siguientes. */
  const firstScroll = useRef(true);
  useEffect(() => {
    const initial = firstScroll.current;
    firstScroll.current = false;
    if (initial && cursor === 0) return; // al entrar sin marcas: no mover
    const row = document.querySelector<HTMLElement>("[data-current]");
    if (!row) return;
    const top = HEADER_HEIGHT;
    const bottom =
      document.querySelector("[data-transport]")?.getBoundingClientRect().top ??
      window.innerHeight;
    const zone = bottom - top;
    const rect = row.getBoundingClientRect();
    const tooLow = rect.top > top + zone * 0.65 || rect.bottom > bottom - 8;
    const tooHigh = rect.top < top;
    if (!tooLow && !tooHigh) return;
    window.scrollTo({
      top: window.scrollY + rect.top - (top + zone * 0.3),
      behavior: initial ? "auto" : smoothBehavior(),
    });
  }, [cursor]);

  /* Autosave de las marcas (debounce): guarda también al salir de la pantalla
     y avisa si se cierra la pestaña con marcas sin guardar. */
  const [touched, setTouched] = useState(false);
  const syncValue = useMemo(
    () => ({
      granularity,
      list: [...stamps.entries()]
        .map(([i, tt]) => ({ i, t: tt }))
        .sort((a, b) => a.i - b.i),
      endAt,
    }),
    [stamps, granularity, endAt],
  );
  const autosave = useAutosave({
    value: syncValue,
    dirty: touched,
    delay: 800,
    // Sin router.refresh(): el estado local ya es la verdad, y al navegar a
    // otra pantalla la página se vuelve a pedir al servidor.
    save: (value) => saveSync(song.id, value.granularity, value.list, value.endAt),
  });

  /* Todas las líneas marcadas: la siguiente marca (opcional) es el fin. */
  const allMarked = totalTargets > 0 && cursor >= totalTargets;
  const endPending = allMarked && endAt === null && !endSkipped;
  const lastStamp = Math.max(0, ...stamps.values());

  const mark = () => {
    if (!engine.ready) return;
    const time = Math.round(engine.now() * 10) / 10;
    if (allMarked) {
      if (!endPending || time <= lastStamp) return;
      setTouched(true);
      setEndAt(time);
      return;
    }
    setTouched(true);
    const next = new Map(stamps).set(cursor, time);
    setStamps(next);
    // Sigue en el próximo objetivo libre: una línea re-marcada (o nueva tras
    // editar la letra) no pisa las que ya estaban marcadas.
    setCursor(nextUnmarked(next, cursor, totalTargets));
    // Una línea marcada en el fin o después lo invalida.
    if (endAt !== null && time >= endAt) setEndAt(null);
  };

  /* Re-marcar el fin: se borra y se vuelve a escuchar un poco antes. */
  const remarkEnd = () => {
    if (endAt === null) return;
    setTouched(true);
    setEndAt(null);
    setEndSkipped(false);
    if (engine.ready) {
      engine.seekTo(Math.max(0, endAt - REVIEW_PREROLL));
      engine.play();
    }
  };
  /* Quitar el fin: queda resuelto como "hasta el final del audio". */
  const removeEnd = () => {
    setTouched(true);
    setEndAt(null);
    setEndSkipped(true);
  };
  /* Agregar un fin después de omitirlo: se escucha desde la última línea. */
  const addEnd = () => {
    setEndSkipped(false);
    if (engine.ready) {
      engine.seekTo(Math.max(0, lastStamp - REVIEW_PREROLL));
      engine.play();
    }
  };

  /* Repasar: volver unos segundos antes de la última marca y escuchar. */
  const review = (from = stamps, at = cursor) => {
    engine.seekTo(reviewStart(from, at));
    engine.play();
  };

  const changeRate = (direction: 1 | -1) =>
    engine.setRate(stepRate(RATES, engine.rate, direction));

  /* Atajos de teclado (Espacio marca; el resto, reproducción). */
  usePlayerShortcuts({
    " ": mark,
    k: engine.toggle,
    ArrowLeft: () => engine.skip(-5),
    ArrowRight: () => engine.skip(5),
    j: () => engine.skip(-SKIP_SECONDS),
    l: () => engine.skip(SKIP_SECONDS),
    Home: () => engine.seekTo(0),
    "[": () => changeRate(-1),
    "]": () => changeRate(1),
    m: engine.toggleMute,
    r: () => review(),
    v: hasVideo ? toggleVideo : undefined,
  });

  /* Re-marcar: borra las marcas de la fila y la vuelve a escuchar desde un
     poco antes de la marca anterior, para no tener que buscarla a mano. */
  const remarkRef = useRef<(row: LineRow) => void>(() => {});
  const onRemark = useCallback((row: LineRow) => remarkRef.current(row), []);
  const remarkLine = (row: LineRow) => {
    setTouched(true);
    const next = new Map(stamps);
    for (let i = 0; i < row.targetCount; i++) next.delete(row.firstTarget + i);
    setStamps(next);
    setCursor(row.firstTarget);
    if (engine.ready) review(next, row.firstTarget);
  };

  useEffect(() => {
    remarkRef.current = remarkLine;
  });

  const applyReset = () => {
    setTouched(true);
    setStamps(new Map());
    setEndAt(null);
    setEndSkipped(false);
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

  const markNumber = Math.min(cursor + 1, totalTargets);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
      {/* Video de YouTube en un mini-reproductor flotante (con MP3 no hay video) */}
      {hasVideo && (
        <FloatingVideo
          containerRef={youtubeContainerRef}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
        />
      )}

      {/* ASIDE IZQUIERDO */}
      <aside className="flex flex-col gap-[18px] lg:sticky lg:top-[90px]">
        {/* FUENTE DE AUDIO */}
        <AudioSourcePanel
          songId={song.id}
          audio={audio}
          duration={engine.duration}
          marks={stamps.size + (endAt !== null ? 1 : 0)}
          fileError={signed.error}
          onBeforeChange={autosave.discard}
        />

        {/* GRANULARIDAD */}
        <div className="overflow-hidden rounded-2xl border border-edge bg-surface">
          <div className="border-b border-edge px-4 py-3.5">
            <span
              id="granularity-title"
              className="text-xs font-bold uppercase tracking-[0.14em] text-tert"
            >
              {t("granularityTitle")}
            </span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby="granularity-title"
            className="flex flex-col gap-2.5 p-4"
          >
            {(["line", "word"] as const).map((value) => {
              const active = granularity === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
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
      <div>
        <button
          type="button"
          onClick={mark}
          disabled={!engine.ready || (allMarked && !endPending)}
          className="mb-2.5 flex w-full cursor-pointer items-center justify-center gap-3.5 rounded-2xl border-[1.5px] border-accent/40 yk-gradient-soft p-[22px] transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-page/40 text-accent">
            {allMarked ? (
              <Flag size={22} strokeWidth={2} />
            ) : (
              <Music size={22} strokeWidth={2} />
            )}
          </span>
          <span className="text-left">
            <span className="block font-bold">
              {allMarked && endAt !== null
                ? t("endDone", { time: formatTime(endAt) })
                : allMarked && endSkipped
                  ? t("endNoneDone")
                  : t.rich(allMarked ? "endTitle" : "tapTitle", {
                      kbd: (chunks) => (
                        <kbd className="rounded-md border border-edge-2 bg-surface-3 px-2 py-0.5 text-[13px] font-bold text-accent">
                          {chunks}
                        </kbd>
                      ),
                    })}
            </span>
            <span className="mt-[3px] block text-[12.5px] text-sub">
              {!engine.ready
                ? t("tapNeedsAudio")
                : allMarked
                  ? t(
                      endAt !== null
                        ? "endDoneHint"
                        : endSkipped
                          ? "endNoneDoneHint"
                          : "endHint",
                    )
                  : t("tapProgress", {
                      n: markNumber,
                      total: totalTargets,
                      granularity: t(`granularityShort.${granularity}`),
                    })}
            </span>
          </span>
        </button>

        {syncMissing > 0 && (
          <p
            role="status"
            className="mb-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-warn"
          >
            <TriangleAlert size={14} strokeWidth={2.2} className="mt-px shrink-0" />
            {t("driftNotice", { count: syncMissing })}
          </p>
        )}

        {/* retomar + estado de guardado */}
        <div className="mb-3 flex justify-end gap-3 text-[12px] font-semibold">
          {showResume && resume && (
            <span className="mr-auto inline-flex items-center gap-1 text-sub">
              <History size={13} strokeWidth={2.2} />
              {t("resumeFrom", { time: formatTime(resume.at) })}
            </span>
          )}
          <span role="status" className="contents">
            {autosave.state === "saving" && (
              <span className="text-sub">{t("saving")}</span>
            )}
            {autosave.state === "saved" && touched && (
              <span className="inline-flex items-center gap-1 text-accent">
                <Check size={13} strokeWidth={2.5} /> {t("saved")}
              </span>
            )}
            {autosave.state === "error" && (
              <span className="inline-flex items-center gap-1 text-warn">
                <TriangleAlert size={13} strokeWidth={2} /> {t("saveError")}
              </span>
            )}
          </span>
          {autosave.state === "error" && (
            <button
              type="button"
              onClick={autosave.retry}
              className="inline-flex cursor-pointer items-center gap-1 text-accent hover:underline"
            >
              <RotateCcw size={12} strokeWidth={2.4} />
              {t("retry")}
            </button>
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
            return (
              <CalibrationLineView
                key={ri}
                row={row}
                granularity={granularity}
                stamps={stamps}
                cursor={cursor}
                onRemark={onRemark}
              />
            );
          })}
          {/* Fin opcional: aparece al marcar todas las líneas */}
          {allMarked && (
            <div
              data-current={endPending || undefined}
              className={`my-0.5 flex items-center gap-3 rounded-[10px] border-l-[3px] px-3.5 py-[11px] ${
                endPending ? "border-l-accent bg-accent/[0.08]" : "border-l-transparent"
              }`}
            >
              <div className="flex w-[74px] shrink-0 items-center gap-[7px]">
                {endAt !== null ? (
                  <span className="inline-flex items-center gap-[5px]">
                    <Flag size={14} strokeWidth={2.4} className="text-accent" />
                    <span className="text-[11.5px] font-semibold tabular-nums text-accent">
                      {formatStamp(endAt)}
                    </span>
                  </span>
                ) : endPending ? (
                  <span className="rounded-full border border-accent/40 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                    {t("now")}
                  </span>
                ) : (
                  <Check size={15} strokeWidth={2.6} className="text-accent" />
                )}
              </div>
              <span
                className={`min-w-0 flex-1 ${endPending ? "text-[17px] font-bold text-ink" : "text-mute"}`}
              >
                {t(
                  endAt !== null ? "endRow" : endPending ? "endRowPending" : "endRowNone",
                )}
              </span>
              {endPending && (
                <button
                  type="button"
                  onClick={() => setEndSkipped(true)}
                  title={t("endSkip")}
                  aria-label={t("endSkip")}
                  className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-warn"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
              {endSkipped && endAt === null && (
                <button
                  type="button"
                  onClick={addEnd}
                  title={t("endAdd")}
                  aria-label={t("endAdd")}
                  className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-accent"
                >
                  <Flag size={16} strokeWidth={2} />
                </button>
              )}
              {endAt !== null && (
                <>
                  <button
                    type="button"
                    onClick={remarkEnd}
                    title={t("endRemark")}
                    aria-label={t("endRemark")}
                    className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-accent"
                  >
                    <RotateCcw size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={removeEnd}
                    title={t("endRemove")}
                    aria-label={t("endRemove")}
                    className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-mute hover:bg-edge hover:text-warn"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          )}
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-tert">{t("noContent")}</p>
          )}
        </div>
      </div>

      {/* TRANSPORTE */}
      <CalibrationTransport
        engine={engine}
        onReview={() => review()}
        onReset={() => setConfirm("reset")}
        resetDisabled={stamps.size === 0}
        video={hasVideo ? { open: videoOpen, onToggle: toggleVideo } : undefined}
      />

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
          setTouched(true);
          setStamps(new Map());
          setEndAt(null);
          setEndSkipped(false);
          setGranularity(pendingGranularity.current);
          setCursor(0);
          setConfirm(null);
        }}
      />
    </div>
  );
}
