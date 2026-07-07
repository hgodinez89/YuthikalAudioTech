"use client";

import {
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
import { ChordCard, type ChordCardData } from "./chord-card";
import { escapeLike, parseChordQuery } from "@/lib/chord-search";
import { NOTE_LABELS, type ChordCategory } from "@/lib/chords";
import { supabaseBrowser } from "@/lib/supabase";

const PAGE_SIZE = 36;

type Row = ChordCardData & { key: string; category: ChordCategory };

type FetchResult = { rows: Row[]; total: number };

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

async function fetchChords(
  rawQuery: string,
  grouping: "cat" | "note",
  offset: number,
): Promise<FetchResult> {
  const parsed = parseChordQuery(rawQuery);
  let qb = supabaseBrowser()
    .from("chords")
    .select(
      "id,key,name_en,name_es,category,positions:chord_positions!inner(base_fret,frets,barres,position)",
      { count: "exact" },
    )
    .eq("positions.position", 1);

  if (parsed.kind === "chord") {
    qb = qb.in("key", parsed.keys);
    if (parsed.suffixes) qb = qb.in("suffix", parsed.suffixes);
  } else if (parsed.kind === "text") {
    qb = qb.ilike("search_text", `%${escapeLike(parsed.text)}%`);
  }

  qb =
    grouping === "cat"
      ? qb.order("category_order").order("note_order").order("name_en")
      : qb.order("note_order").order("category_order").order("name_en");

  const { data, count, error } = await qb.range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const rows: Row[] = (data ?? []).map((r) => ({
    id: r.id as string,
    key: r.key as string,
    name_en: r.name_en as string,
    name_es: r.name_es as string,
    category: r.category as ChordCategory,
    position: (r.positions as Row["position"][])[0],
  }));
  return { rows, total: count ?? 0 };
}

function groupRows(rows: Row[], grouping: "cat" | "note") {
  const groups: { label: string; rows: Row[] }[] = [];
  for (const row of rows) {
    const label = grouping === "cat" ? row.category : row.key;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else groups.push({ label, rows: [row] });
  }
  return groups;
}

export function ChordFinder() {
  const t = useTranslations("finder");
  const locale = useLocale() as "es" | "en";

  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<"cat" | "note">("cat");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

  /* Carga inicial y cada cambio de búsqueda/agrupación (con debounce). */
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(
      () => {
        setLoading(true);
        fetchChords(query, grouping, 0)
          .then((res) => {
            if (requestId.current !== id) return;
            setRows(res.rows);
            setTotal(res.total);
            setLoading(false);
          })
          .catch((e: Error) => requestId.current === id && setError(e));
      },
      query ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [query, grouping]);

  const hasMore = rows.length < total;

  const loadMore = useCallback(() => {
    const id = requestId.current;
    fetchChords(query, grouping, rows.length)
      .then((res) => {
        if (requestId.current !== id) return;
        setRows((prev) => [...prev, ...res.rows]);
        setTotal(res.total);
      })
      .catch((e: Error) => requestId.current === id && setError(e));
  }, [query, grouping, rows.length]);

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
      setQuery(transcript);
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

  const groups = groupRows(rows, grouping);
  const showEmpty = !loading && rows.length === 0 && query.length > 0;

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-20 pt-7">
      {/* TÍTULO */}
      <div className="mb-[22px]">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-accent">
          {t("eyebrow")}
        </div>
        <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{t("title")}</h1>
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
            onChange={(e) => setQuery(e.target.value)}
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
      {showVoice && (
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
            <span
              className={`flex items-center gap-[7px] ${voiceDisabled ? "text-warn" : "text-tert"}`}
            >
              <Info size={14} strokeWidth={2} />
              {voiceDisabled ? t("micNoteUnsupported") : t("micNote")}
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
              <ChordCard key={row.id} chord={row} />
            ))}
          </div>
        </section>
      ))}

      {/* SIN RESULTADOS */}
      {showEmpty && (
        <div className="px-5 py-[70px] text-center text-tert">
          <Search size={42} strokeWidth={1.6} className="mx-auto mb-3.5 text-edge-2" />
          <div className="font-semibold text-ink">{t("empty", { query })}</div>
          <div className="mt-1.5 text-[13.5px]">{t("emptyHint")}</div>
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
        className="yk-gradient fixed bottom-6 right-6 z-50 grid size-[52px] cursor-pointer place-items-center rounded-full shadow-[0_8px_24px_rgba(46,107,240,0.4)]"
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
