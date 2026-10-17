"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Mic,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChordCard } from "./chord-card";
import {
  fetchChords,
  QUICK_TYPES,
  type ChordGrouping,
  type ChordPage,
  type ChordPicks,
  type ChordRow,
} from "@/lib/chord-query";
import { chordSlug, composeChordQuery, parseChordQuery } from "@/lib/chord-search";
import { DB_KEYS, NOTE_LABELS, ROOT_SHORT_ES, type ChordCategory } from "@/lib/chords";
import type { Instrument } from "@/lib/instruments";
import { useStoredFlag } from "@/lib/use-stored-flag";

const NO_PICKS: ChordPicks = { keys: [], suffixes: [] };

/* Agrega o quita un valor conservando el orden del selector. */
function togglePick(list: string[], value: string, order: readonly string[]): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : order.filter((v) => v === value || list.includes(v));
}

/* Reconocimiento de voz (Chrome/Edge). Tipado mínimo del API Web Speech. */
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult:
    ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  abort(): void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | undefined {
  const w = window as unknown as Record<string, new () => SpeechRecognitionInstance>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/* iOS: la Web Speech API está presente pero no entrega resultados en WebKit
   (Safari/Chrome/Brave usan el mismo motor). No hay forma de feature-detectar
   ese fallo, así que se detecta la plataforma y se oculta la voz por completo. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

type VoiceStatus = "ssr" | "ios" | "unsupported" | "ok";

function voiceStatus(): Exclude<VoiceStatus, "ssr"> {
  if (isIOS()) return "ios";
  return getSpeechRecognitionCtor() ? "ok" : "unsupported";
}

/* Código de error del API → clave de mensaje i18n. */
function voiceErrorKey(error: string): string {
  switch (error) {
    case "no-speech":
      return "noSpeech";
    case "not-allowed":
    case "service-not-allowed":
      return "notAllowed";
    case "audio-capture":
      return "audioCapture";
    case "network":
      return "network";
    default:
      return "generic";
  }
}

/* supabase-js solo se descarga al buscar o paginar: la primera página viene
   del servidor. */
async function fetchPage(
  instrument: Instrument,
  query: string,
  grouping: ChordGrouping,
  offset: number,
  picks: ChordPicks,
): Promise<ChordPage> {
  const { supabaseBrowser } = await import("@/lib/supabase");
  return fetchChords(supabaseBrowser(), instrument, query, grouping, offset, picks);
}

function groupRows(rows: ChordRow[], grouping: ChordGrouping) {
  const groups: { label: string; rows: ChordRow[] }[] = [];
  for (const row of rows) {
    const label = grouping === "cat" ? row.category : row.key;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}

export function ChordFinder({
  instrument,
  initial,
}: {
  instrument: Instrument;
  /** Primera página sin búsqueda (por categoría), ya consultada en el servidor. */
  initial: ChordPage;
}) {
  const t = useTranslations("finder");
  const tInstruments = useTranslations("instruments");
  const locale = useLocale() as "es" | "en";

  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<ChordGrouping>("cat");
  /* Selección múltiple: los botones tienen estado propio y reemplazan la
     búsqueda escrita (y viceversa). Sin ella, los botones escriben la búsqueda. */
  const [multi, setMulti] = useStoredFlag("yk-finder-multi", false);
  const [picks, setPicks] = useState<ChordPicks>(NO_PICKS);
  const [rows, setRows] = useState<ChordRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(false);

  const requestId = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  /* "ssr" durante hidratación; luego ios/unsupported/ok ya montado. */
  const status = useSyncExternalStore<VoiceStatus>(
    () => () => {},
    voiceStatus,
    () => "ssr",
  );
  const showVoice = status !== "ios"; // en iOS no se muestra nada de voz
  const voiceDisabled = status === "unsupported";
  const voiceReady = status === "ok";

  if (error) throw error; // → error boundary (BD pausada / sin conexión)

  const picking = picks.keys.length > 0 || picks.suffixes.length > 0;

  /* Cada cambio de búsqueda/selección/agrupación (con debounce). Sin filtros y
     por categoría se reutiliza la primera página del servidor, sin red ni loader. */
  useEffect(() => {
    const id = ++requestId.current;
    const isInitial = !query && !picking && grouping === "cat";
    const timer = setTimeout(
      () => {
        if (!isInitial) setLoading(true);
        (isInitial
          ? Promise.resolve(initial)
          : fetchPage(instrument, query, grouping, 0, picks)
        )
          .then((res) => {
            if (requestId.current !== id) return;
            setRows(res.rows);
            setTotal(res.total);
            setLoading(false);
          })
          .catch((e: Error) => requestId.current === id && setError(e));
      },
      // varios botones seguidos se agrupan en una sola consulta
      query ? 300 : picking ? 150 : 0,
    );
    return () => clearTimeout(timer);
  }, [instrument, initial, query, grouping, picks, picking]);

  const hasMore = rows.length < total;

  const loadMore = useCallback(() => {
    const id = requestId.current;
    fetchPage(instrument, query, grouping, rows.length, picks)
      .then((res) => {
        if (requestId.current !== id) return;
        setRows((prev) => [...prev, ...res.rows]);
        setTotal(res.total);
      })
      .catch((e: Error) => requestId.current === id && setError(e));
  }, [instrument, query, grouping, rows.length, picks]);

  /* Scroll infinito: el loader del fondo dispara la siguiente página. */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  /* Estado del FAB según posición del scroll. */
  useEffect(() => {
    const onScroll = () => {
      const near =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100;
      setAtBottom(near);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const search = (text: string) => {
    setQuery(text);
    if (text) setPicks(NO_PICKS);
  };

  const toggleMic = () => {
    if (!voiceReady) return;
    if (listening) {
      recognitionRef.current?.abort();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = locale === "es" ? "es-ES" : "en-US";
    // interimResults: entrega la transcripción progresivamente (más fiable
    // y rápido; algunos navegadores no entregan si es solo el resultado final).
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      search(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      // "aborted" ocurre al detener manualmente; no es un error a mostrar.
      if (event.error !== "aborted") setVoiceError(event.error);
      setListening(false);
    };
    recognitionRef.current = recognition;
    setVoiceError(null);
    setListening(true);
    recognition.start();
  };

  /* Selector rápido. Una opción: su estado se deriva del texto buscado.
     Varias: estado propio (picks). */
  const parsedQuery = parseChordQuery(query);
  const activeKey = parsedQuery.kind === "chord" ? parsedQuery.keys[0] : null;
  const activeType =
    parsedQuery.kind === "chord" ? (parsedQuery.suffixes?.[0] ?? null) : null;
  const noteOn = (key: string) => (multi ? picks.keys.includes(key) : activeKey === key);
  const typeOn = (suffix: string) =>
    multi ? picks.suffixes.includes(suffix) : activeType === suffix;
  const pickNote = (key: string) => {
    if (multi) {
      setQuery("");
      setPicks((p) => ({ ...p, keys: togglePick(p.keys, key, DB_KEYS) }));
    } else {
      setQuery(key === activeKey ? "" : composeChordQuery(key, activeType, locale));
    }
  };
  const pickType = (suffix: string) => {
    if (multi) {
      setQuery("");
      setPicks((p) => ({ ...p, suffixes: togglePick(p.suffixes, suffix, QUICK_TYPES) }));
    } else if (activeKey) {
      setQuery(
        composeChordQuery(activeKey, suffix === activeType ? null : suffix, locale),
      );
    }
  };
  /* Al activar, lo elegido pasa a ser la primera selección; al desactivar se limpia. */
  const toggleMulti = () => {
    if (multi) {
      setPicks(NO_PICKS);
    } else if (activeKey) {
      setPicks({ keys: [activeKey], suffixes: activeType ? [activeType] : [] });
      setQuery("");
    }
    setMulti(!multi);
  };

  const noteLabel = (key: string) => (locale === "es" ? ROOT_SHORT_ES[key] : key);
  const typeLabel = (suffix: string) =>
    suffix === "major" || suffix === "minor" ? t(`types.${suffix}`) : suffix;

  const groups = groupRows(rows, grouping);
  const showEmpty = !loading && rows.length === 0 && (query.length > 0 || picking);

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-20 pt-7">
      {/* TÍTULO */}
      <div className="mb-[22px]">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow", { instrument: tInstruments(`${instrument}.name`) })}
        </div>
        <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{t("title")}</h1>
      </div>

      {/* SELECTOR RÁPIDO: NOTA → TIPO */}
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-sub">
            {t("quickPick")}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={multi}
            onClick={toggleMulti}
            title={multi ? t("multiOnHint") : t("multiOffHint")}
            className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold text-sub hover:text-ink"
          >
            {t("multi")}
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                multi ? "yk-gradient" : "border border-edge-2 bg-surface-3"
              }`}
            >
              <span
                className={`absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-[left] ${
                  multi ? "left-[19px]" : "left-[2px]"
                }`}
              />
            </span>
          </button>
        </div>
        <div
          role="group"
          aria-label={t("pickNote")}
          className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:flex-wrap"
        >
          {DB_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => pickNote(key)}
              aria-pressed={noteOn(key)}
              className={`inline-flex min-w-[46px] shrink-0 cursor-pointer items-center justify-center gap-1 rounded-[10px] px-2.5 py-2 text-[13.5px] ${
                noteOn(key)
                  ? "yk-gradient font-bold"
                  : "border border-edge bg-surface-2 font-semibold text-sub hover:border-edge-2 hover:text-ink"
              }`}
            >
              {multi && noteOn(key) && <Check size={13} strokeWidth={3} />}
              {noteLabel(key)}
            </button>
          ))}
        </div>
        {(multi || activeKey) && (
          <div
            role="group"
            aria-label={t("pickType")}
            className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:flex-wrap"
          >
            {QUICK_TYPES.map((suffix) => (
              <button
                key={suffix}
                type="button"
                onClick={() => pickType(suffix)}
                aria-pressed={typeOn(suffix)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3.5 py-1.5 text-[13px] ${
                  typeOn(suffix)
                    ? "border-accent bg-accent/15 font-bold text-accent"
                    : "border-edge bg-surface-2 font-semibold text-sub hover:text-ink"
                }`}
              >
                {multi && typeOn(suffix) && <Check size={12} strokeWidth={3} />}
                {typeLabel(suffix)}
              </button>
            ))}
          </div>
        )}
        {/* RESUMEN DE LA SELECCIÓN MÚLTIPLE (en móvil las filas se desplazan
            y parte de lo elegido puede quedar fuera de vista) */}
        {multi && picking && (
          <div
            aria-live="polite"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-sub"
          >
            {picks.keys.length > 0 && (
              <span>
                <span className="font-semibold text-ink">
                  {t("pickedNotes", { count: picks.keys.length })}
                </span>
                {": "}
                {picks.keys.map(noteLabel).join(", ")}
              </span>
            )}
            {picks.keys.length > 0 && picks.suffixes.length > 0 && (
              <span className="text-tert">·</span>
            )}
            {picks.suffixes.length > 0 && (
              <span>
                <span className="font-semibold text-ink">
                  {t("pickedTypes", { count: picks.suffixes.length })}
                </span>
                {": "}
                {picks.suffixes.map(typeLabel).join(", ")}
              </span>
            )}
            <button
              type="button"
              onClick={() => setPicks(NO_PICKS)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold text-accent hover:bg-accent/10"
            >
              <X size={13} strokeWidth={2.4} />
              {t("clearPicks")}
            </button>
          </div>
        )}
      </div>

      {/* BÚSQUEDA */}
      <div className="flex items-stretch gap-2.5">
        <div className="relative flex flex-1 items-center">
          <Search
            size={19}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 text-tert"
          />
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-[54px] w-full rounded-[14px] border border-edge bg-surface-2 px-[46px] text-base text-ink outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_rgba(53,214,232,0.14)] dark:bg-surface-2"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute right-3 grid size-[26px] cursor-pointer place-items-center rounded-full bg-edge text-sub"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          )}
        </div>
        {/* MICRÓFONO — oculto por completo en iOS (Web Speech no funciona ahí) */}
        {showVoice && (
          <div className="relative grid size-[54px] shrink-0 place-items-center">
            {listening && (
              <span className="absolute inset-0 rounded-[14px] bg-accent/40 [animation:yk-pulse-ring_1.6s_ease-out_infinite]" />
            )}
            <button
              type="button"
              onClick={toggleMic}
              disabled={voiceDisabled}
              aria-label={t("micLabel")}
              title={voiceDisabled ? t("micTitleUnsupported") : t("micTitle")}
              className={
                voiceDisabled
                  ? "relative grid size-[54px] cursor-not-allowed place-items-center rounded-[14px] border border-edge bg-surface-3 text-disabled"
                  : listening
                    ? "yk-gradient relative grid size-[54px] cursor-pointer place-items-center rounded-[14px] shadow-[0_0_22px_rgba(53,214,232,0.5)]"
                    : "relative grid size-[54px] cursor-pointer place-items-center rounded-[14px] border border-edge-2 bg-surface-2 text-accent"
              }
            >
              <Mic size={21} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* LÍNEA DE ESTADO DE VOZ — misma ranura, 3 estados (escuchando/error/nota) */}
      {showVoice && (listening || voiceError || voiceDisabled) && (
        <div className="mt-2.5 flex min-h-[18px] items-center gap-[7px] text-[12.5px]">
          {listening ? (
            <span className="flex items-center gap-2 text-accent">
              <span className="flex h-[14px] items-end gap-[2px]">
                {[8, 13, 10, 15].map((h, i) => (
                  <span
                    key={i}
                    className="block w-[3px] origin-bottom rounded-[2px] bg-accent"
                    style={{
                      height: h,
                      animation: "yk-bar 1s ease-in-out infinite",
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </span>
              {t("listening")}
            </span>
          ) : voiceError ? (
            <span className="flex items-center gap-[7px] text-warn">
              <TriangleAlert size={14} strokeWidth={2} />
              {t(`voiceError.${voiceErrorKey(voiceError)}`)}
            </span>
          ) : (
            <span className="flex items-center gap-[7px] text-warn">
              <Info size={14} strokeWidth={2} />
              {t("micNoteUnsupported")}
            </span>
          )}
        </div>
      )}

      {/* CONTROLES */}
      <div className="mb-2 mt-[22px] flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold">
          {(["cat", "note"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setGrouping(mode)}
              className={
                grouping === mode
                  ? "yk-gradient cursor-pointer whitespace-nowrap rounded-[9px] px-[15px] py-[7px]"
                  : "cursor-pointer whitespace-nowrap rounded-[9px] px-[15px] py-[7px] text-sub"
              }
            >
              {mode === "cat" ? t("byCategory") : t("byNote")}
            </button>
          ))}
        </div>
        <div className="text-[13px] text-sub">
          {t.rich("showing", {
            shown: rows.length,
            total,
            b: (chunks) => <span className="font-semibold text-ink">{chunks}</span>,
          })}
        </div>
      </div>

      {/* RESULTADOS */}
      {groups.map((group) => (
        <section key={group.label} className="mt-2.5">
          <div className="sticky top-[71px] z-20 flex items-center gap-3 px-0.5 pb-3 pt-3.5 [background:linear-gradient(var(--page)_68%,transparent)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sub">
              {grouping === "cat"
                ? t(`categories.${group.label as ChordCategory}`)
                : NOTE_LABELS[locale][group.label]}
            </h2>
            <span className="text-[11px] font-semibold text-tert">
              {group.rows.length}
            </span>
            <span className="h-px flex-1 bg-edge" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {group.rows.map((row) => (
              <ChordCard
                key={row.id}
                chord={row}
                href={`/${instrument}/chords/${chordSlug(row.key, row.suffix)}`}
              />
            ))}
          </div>
        </section>
      ))}

      {/* SIN RESULTADOS */}
      {showEmpty && (
        <div className="px-5 py-[70px] text-center text-tert">
          <Search size={42} strokeWidth={1.6} className="mx-auto mb-3.5 text-edge-2" />
          <div className="font-semibold text-ink">
            {query ? t("empty", { query }) : t("emptyPicks")}
          </div>
          <div className="mt-1.5 text-[13.5px]">
            {query ? t("emptyHint") : t("emptyPicksHint")}
          </div>
        </div>
      )}

      {/* LOADER DE SCROLL INFINITO */}
      {(hasMore || loading) && !showEmpty && (
        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-3 pb-2 pt-[46px] text-mute"
        >
          <div className="flex h-[26px] items-end gap-1">
            {[10, 18, 24, 16, 22, 12, 20, 14].map((h, i) => (
              <span
                key={i}
                className="block w-1 origin-bottom rounded-[3px]"
                style={{
                  height: h,
                  background: "linear-gradient(var(--grad-from), var(--grad-to))",
                  animation: "yk-bar 1s ease-in-out infinite",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span className="text-[12.5px] tracking-[0.02em]">{t("loadingMore")}</span>
        </div>
      )}

      {/* FAB DE SCROLL */}
      <button
        type="button"
        onClick={() =>
          window.scrollTo({
            top: atBottom ? 0 : document.documentElement.scrollHeight,
            behavior: "smooth",
          })
        }
        aria-label={atBottom ? t("fabUp") : t("fabDown")}
        className="yk-gradient fixed bottom-[92px] right-5 z-50 md:bottom-6 sm:right-6 grid size-[52px] cursor-pointer place-items-center rounded-full shadow-[0_8px_24px_rgba(46,107,240,0.4)]"
      >
        {atBottom ? (
          <ChevronUp size={22} strokeWidth={2.4} />
        ) : (
          <ChevronDown size={22} strokeWidth={2.4} />
        )}
      </button>
    </div>
  );
}
