"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChordVisual } from "./chord-visual";
import {
  isInstrumental,
  sectionTitle,
  strumToArrows,
  type SheetSection,
  wordGroups,
} from "@/lib/chordpro";
import { ROOT_SHORT_ES } from "@/lib/chords";
import { smoothBehavior } from "@/lib/motion";
import { useAtBottom } from "@/lib/use-at-bottom";

export type SheetChordData = {
  name: string;
  nameEs: string;
  /** De la biblioteca del usuario ("Mío"), no del catálogo. */
  custom?: boolean;
  /** Acorde con bajo no definido ("C/E"): diagrama del base + su bajo (nota). */
  bass?: string;
  /** Piano: teclas del acorde (los trastes quedan vacíos). */
  keys?: number[];
  frets: number[];
  barres: number[];
  baseFret: number;
};

export type ChordDataMap = Record<string, SheetChordData | undefined>;

type ChordPopover = {
  name: string;
  /** Centro horizontal y bordes del acorde (coordenadas de la ventana). */
  x: number;
  top: number;
  bottom: number;
  /** Abierto al tocar o hacer clic: no se cierra al sacar el mouse. */
  pinned: boolean;
};

/* Tamaño base de la letra (text-lg); el resto de medidas son relativas (em). */
const BASE_FONT_PX = 18;

/** Debajo del nombre: "Mío" (biblioteca propia), el nombre en español y el bajo. */
function ChordCaption({
  chord,
  className,
}: {
  chord: SheetChordData;
  className: string;
}) {
  const t = useTranslations("songView");
  const locale = useLocale();
  const bass =
    chord.bass &&
    (locale === "es" ? (ROOT_SHORT_ES[chord.bass] ?? chord.bass) : chord.bass);
  return (
    <span className={`flex flex-col items-center ${className}`}>
      {chord.custom ? (
        <span className="font-bold uppercase tracking-[0.06em] text-accent">
          {t("mine")}
        </span>
      ) : (
        <span>{chord.nameEs}</span>
      )}
      {bass && <span className="text-tert">{t("bass", { note: bass })}</span>}
    </span>
  );
}

/** Nota para el músico ({c: …}): indicación aparte, no letra. */
export function SheetNote({ text }: { text: string }) {
  return (
    <div className="my-[0.44em]">
      <span className="inline-block rounded-lg border border-edge bg-surface-2 px-[0.857em] py-[0.286em] text-[0.778em] italic leading-normal text-sub">
        {text}
      </span>
    </div>
  );
}

/** Repetición de una línea instrumental (x2 → "×2"). */
export function RepeatBadge({ times }: { times: number }) {
  return (
    <span className="rounded-md border border-accent/35 bg-accent/10 px-[0.615em] py-[0.154em] text-[0.722em] font-bold leading-normal text-accent">
      ×{times}
    </span>
  );
}

/** Chord sheet clásico: acordes en cian sobre la sílaba exacta del cambio. */
export function ChordSheet({
  sections,
  chords,
  showLegend = true,
  showFab = true,
  zoom = 1,
}: {
  sections: SheetSection[];
  chords: ChordDataMap;
  showLegend?: boolean;
  showFab?: boolean;
  /** Escala de la letra (modo libro); 1 = tamaño normal. */
  zoom?: number;
}) {
  const t = useTranslations("songView");
  const [popover, setPopover] = useState<ChordPopover | null>(null);
  const [bottomRef, atBottom] = useAtBottom();
  const popoverId = useId();
  const popoverRef = useRef<HTMLDivElement>(null);

  const legendChords = Object.values(chords).filter(
    (c): c is SheetChordData => c !== undefined,
  );
  const popoverChord = popover ? chords[popover.name] : undefined;

  /* Popover del diagrama: al pasar el mouse, con el foco o al tocar (en
     táctil queda fijo hasta tocar afuera, Escape o desplazarse). */
  const openAt = (name: string, el: HTMLElement, pinned: boolean) => {
    const r = el.getBoundingClientRect();
    setPopover({ name, x: r.left + r.width / 2, top: r.top, bottom: r.bottom, pinned });
  };
  const chordName = (chord: string | null, className: string, children: ReactNode) =>
    chord && chords[chord] ? (
      <button
        type="button"
        data-chord-trigger
        aria-describedby={popover?.name === chord ? popoverId : undefined}
        onMouseEnter={(e) => !popover?.pinned && openAt(chord, e.currentTarget, false)}
        onMouseLeave={() => setPopover((p) => (p?.pinned ? p : null))}
        onFocus={(e) => openAt(chord, e.currentTarget, false)}
        onBlur={() => setPopover(null)}
        onClick={(e) =>
          popover?.name === chord && popover.pinned
            ? setPopover(null)
            : openAt(chord, e.currentTarget, true)
        }
        className={`${className} cursor-pointer rounded-sm text-left`}
      >
        {children}
      </button>
    ) : (
      <span className={className}>{children}</span>
    );

  const open = popover !== null;
  useEffect(() => {
    if (!open) return;
    const close = () => setPopover(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-chord-trigger]")) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  /* Dentro de la pantalla: arriba del acorde, o abajo si no cabe; nunca
     cortado por los lados. */
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !popover) return;
    const margin = 8;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(
      Math.max(popover.x - w / 2, margin),
      window.innerWidth - w - margin,
    );
    const above = popover.top - h - 12;
    el.style.left = `${left}px`;
    el.style.top = `${above >= margin ? above : popover.bottom + 12}px`;
    el.style.visibility = "visible";
  }, [popover]);

  return (
    <>
      {/* LETRA CON ACORDES — tamaños en em: el zoom solo cambia el tamaño base */}
      <div
        className="text-lg leading-[1.9]"
        style={zoom === 1 ? undefined : { fontSize: `${BASE_FONT_PX * zoom}px` }}
      >
        {sections.map((section, si) => {
          const label = sectionTitle(section, (type) => t(type));
          const header = (label || section.strum) && (
            <div className="mb-[0.78em] flex flex-wrap items-center gap-[0.67em]">
              {label && (
                <span className="text-[0.667em] font-bold uppercase tracking-[0.22em] text-accent">
                  {label}
                </span>
              )}
              {section.strum && (
                <span className="inline-flex items-center gap-[0.67em] rounded-lg border border-edge bg-surface-2 px-[0.92em] py-[0.33em] text-[0.667em] leading-normal text-sub">
                  <span className="text-[0.875em] font-semibold uppercase tracking-[0.08em] text-mute">
                    {t("strum")}
                  </span>
                  <span className="tracking-[0.14em]">
                    {strumToArrows(section.strum)}
                  </span>
                </span>
              )}
            </div>
          );
          // Cada línea es indivisible: en modo libro nunca se parte entre páginas.
          const lines = section.lines.map((line, li) =>
            line.length === 0 ? (
              <div key={li} className="h-[1.2em]" />
            ) : line[0].note ? (
              <div key={li} data-line className="break-inside-avoid">
                <SheetNote text={line[0].text} />
              </div>
            ) : isInstrumental(line) ? (
              /* Solo acordes (intro, solo…): una fila, sin letra vacía */
              <div
                key={li}
                data-line
                className="mb-[0.22em] flex break-inside-avoid flex-wrap items-center gap-x-[0.78em] gap-y-[0.22em]"
              >
                {line.map((segment, gi) =>
                  segment.bar ? (
                    <span key={gi} className="font-light text-edge-2">
                      |
                    </span>
                  ) : segment.repeat ? (
                    <RepeatBadge key={gi} times={segment.repeat} />
                  ) : (
                    <span key={gi}>
                      {chordName(
                        segment.chord,
                        "font-extrabold tracking-[0.01em] text-accent",
                        segment.chord,
                      )}
                    </span>
                  ),
                )}
              </div>
            ) : (
              <div
                key={li}
                data-line
                className="mb-[0.22em] flex break-inside-avoid flex-wrap items-end"
              >
                {/* El renglón salta entre palabras: una palabra con un acorde
                    en medio (any[A7m]more) baja completa */}
                {wordGroups(line).map((group, wi) => (
                  <span key={wi} className="inline-flex items-end">
                    {group.map((piece, pi) => (
                      <span key={pi} className="inline-flex flex-col whitespace-pre">
                        {chordName(
                          piece.chord,
                          "min-h-[1.571em] text-[0.778em] font-extrabold leading-relaxed tracking-[0.01em] text-accent",
                          piece.chord ?? "",
                        )}
                        {/* acorde al final sin palabra: espacio duro para que la
                            columna mida una línea y el acorde no se hunda */}
                        <span>{piece.text || " "}</span>
                      </span>
                    ))}
                  </span>
                ))}
              </div>
            ),
          );
          return (
            <section key={si} data-section={si} className="mb-[1.89em]">
              {/* El título nunca queda solo al pie de una página: va con su primera línea */}
              {header ? (
                <div className="break-inside-avoid">
                  {header}
                  {lines[0]}
                </div>
              ) : (
                lines[0]
              )}
              {lines.slice(1)}
            </section>
          );
        })}
      </div>

      {/* ACORDES EN ESTA CANCIÓN */}
      {showLegend && legendChords.length > 0 && (
        <div data-legend className="mt-[46px] border-t border-edge pt-[26px]">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sub">
            {t("chordsInSong")}
          </div>
          {/* Tarjetas en línea (no flex-wrap): en modo libro se reparten entre
              páginas como texto y nunca se parten. */}
          <div className="-mb-3">
            {legendChords.map((chord) => (
              <article
                key={chord.name}
                data-legend
                className="mb-3 mr-3 inline-flex min-w-[118px] break-inside-avoid flex-col items-center rounded-2xl border border-edge bg-surface px-3.5 pb-3 pt-3.5 align-top"
              >
                <div className="pb-2">
                  <ChordVisual chord={chord} scale={zoom} />
                </div>
                <span className="font-extrabold">{chord.name}</span>
                <ChordCaption chord={chord} className="text-xs text-sub" />
              </article>
            ))}
          </div>
        </div>
      )}

      {/* POPOVER DE ACORDE */}
      {popover && popoverChord && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="tooltip"
          // Se ubica al medirlo (useLayoutEffect): invisible hasta entonces.
          style={{ visibility: "hidden" }}
          className="pointer-events-none fixed left-0 top-0 z-[60] flex flex-col items-center rounded-[14px] border border-edge-2 bg-surface px-3.5 pb-2.5 pt-3 shadow-pop"
        >
          <div className="pb-1.5">
            <ChordVisual chord={popoverChord} />
          </div>
          <span className="text-[15px] font-extrabold">{popoverChord.name}</span>
          <ChordCaption chord={popoverChord} className="text-[11.5px] text-sub" />
        </div>
      )}

      {/* FAB DE SCROLL: un centinela al pie decide si sube o baja */}
      {showFab && <div ref={bottomRef} aria-hidden />}
      {showFab && (
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: atBottom ? 0 : document.documentElement.scrollHeight,
              behavior: smoothBehavior(),
            })
          }
          aria-label={atBottom ? t("fabUp") : t("fabDown")}
          className="yk-gradient fixed bottom-6 right-6 z-50 grid size-[52px] cursor-pointer place-items-center rounded-full shadow-fab"
        >
          {atBottom ? (
            <ChevronUp size={22} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={22} strokeWidth={2.4} />
          )}
        </button>
      )}
    </>
  );
}
