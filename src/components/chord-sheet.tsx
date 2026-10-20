"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import { ChordVisual } from "./chord-visual";
import {
  isInstrumental,
  sectionTitle,
  strumToArrows,
  type SheetSection,
  wordGroups,
} from "@/lib/chordpro";
import { useAtBottom } from "@/lib/use-at-bottom";

export type SheetChordData = {
  name: string;
  nameEs: string;
  /** Piano: teclas del acorde (los trastes quedan vacíos). */
  keys?: number[];
  frets: number[];
  barres: number[];
  baseFret: number;
};

export type ChordDataMap = Record<string, SheetChordData | undefined>;

/* Tamaño base de la letra (text-lg); el resto de medidas son relativas (em). */
const BASE_FONT_PX = 18;

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
  const [popover, setPopover] = useState<{ name: string; x: number; y: number } | null>(
    null,
  );
  const [bottomRef, atBottom] = useAtBottom();

  const legendChords = Object.values(chords).filter(
    (c): c is SheetChordData => c !== undefined,
  );
  const popoverChord = popover ? chords[popover.name] : undefined;

  /* Popover de diagrama al pasar el mouse sobre un acorde conocido. */
  const chordHover = (chord: string | null) => ({
    onMouseEnter:
      chord && chords[chord]
        ? (e: MouseEvent<HTMLSpanElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPopover({ name: chord, x: r.left + r.width / 2, y: r.top });
          }
        : undefined,
    onMouseLeave: chord ? () => setPopover(null) : undefined,
  });

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
                    <span
                      key={gi}
                      {...chordHover(segment.chord)}
                      className="font-extrabold tracking-[0.01em] text-accent"
                    >
                      {segment.chord}
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
                        <span
                          {...chordHover(piece.chord)}
                          className="min-h-[1.571em] text-[0.778em] font-extrabold leading-relaxed tracking-[0.01em] text-accent"
                        >
                          {piece.chord ?? ""}
                        </span>
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
                <span className="text-xs text-sub">{chord.nameEs}</span>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* POPOVER DE ACORDE */}
      {popover && popoverChord && (
        <div
          className="pointer-events-none fixed z-[60] flex -translate-x-1/2 flex-col items-center rounded-[14px] border border-edge-2 bg-surface px-3.5 pb-2.5 pt-3 shadow-[0_12px_34px_rgba(0,0,0,0.6)]"
          style={{
            left: popover.x,
            top: popover.y,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <div className="pb-1.5">
            <ChordVisual chord={popoverChord} />
          </div>
          <span className="text-[15px] font-extrabold">{popoverChord.name}</span>
          <span className="text-[11.5px] text-sub">{popoverChord.nameEs}</span>
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
      )}
    </>
  );
}
