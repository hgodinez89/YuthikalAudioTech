"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChordDiagram } from "./chord-diagram";
import { strumToArrows, type SheetSection, type SectionType } from "@/lib/chordpro";

export type SheetChordData = {
  name: string;
  nameEs: string;
  frets: number[];
  barres: number[];
  baseFret: number;
};

export type ChordDataMap = Record<string, SheetChordData | undefined>;

function sectionLabel(section: SheetSection, t: (key: string) => string): string | null {
  if (section.label) return section.label;
  if (section.type === "plain") return null;
  const base = t(section.type satisfies SectionType);
  if (section.type === "verse") return `${base} ${section.number}`;
  return section.number > 1 ? `${base} ${section.number}` : base;
}

/** Chord sheet clásico: acordes en cian sobre la sílaba exacta del cambio. */
export function ChordSheet({
  sections,
  chords,
  showLegend = true,
  showFab = true,
}: {
  sections: SheetSection[];
  chords: ChordDataMap;
  showLegend?: boolean;
  showFab?: boolean;
}) {
  const t = useTranslations("songView");
  const [popover, setPopover] = useState<{ name: string; x: number; y: number } | null>(
    null,
  );
  const [atBottom, setAtBottom] = useState(false);

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

  const legendChords = Object.values(chords).filter(
    (c): c is SheetChordData => c !== undefined,
  );
  const popoverChord = popover ? chords[popover.name] : undefined;

  return (
    <>
      {/* LETRA CON ACORDES */}
      <div className="text-lg leading-[1.9]">
        {sections.map((section, si) => {
          const label = sectionLabel(section, t);
          return (
            <section key={si} className="mb-[34px]">
              {(label || section.strum) && (
                <div className="mb-3.5 flex flex-wrap items-center gap-3">
                  {label && (
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                      {label}
                    </span>
                  )}
                  {section.strum && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-edge bg-surface-2 px-[11px] py-1 text-xs text-sub">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mute">
                        {t("strum")}
                      </span>
                      <span className="tracking-[0.14em]">
                        {strumToArrows(section.strum)}
                      </span>
                    </span>
                  )}
                </div>
              )}
              {section.lines.map((line, li) =>
                line.length === 0 ? (
                  <div key={li} className="h-[1.2em]" />
                ) : (
                  <div key={li} className="mb-1 flex flex-wrap items-end">
                    {line.map((segment, gi) => (
                      <span key={gi} className="inline-flex flex-col whitespace-pre">
                        <span
                          onMouseEnter={
                            segment.chord && chords[segment.chord]
                              ? (e) => {
                                  const r = e.currentTarget.getBoundingClientRect();
                                  setPopover({
                                    name: segment.chord!,
                                    x: r.left + r.width / 2,
                                    y: r.top,
                                  });
                                }
                              : undefined
                          }
                          onMouseLeave={
                            segment.chord ? () => setPopover(null) : undefined
                          }
                          className="min-h-[22px] text-sm font-extrabold leading-relaxed tracking-[0.01em] text-accent"
                        >
                          {segment.chord ?? ""}
                        </span>
                        <span>{segment.text}</span>
                      </span>
                    ))}
                  </div>
                ),
              )}
            </section>
          );
        })}
      </div>

      {/* ACORDES EN ESTA CANCIÓN */}
      {showLegend && legendChords.length > 0 && (
        <div className="mt-[46px] border-t border-edge pt-[26px]">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-sub">
            {t("chordsInSong")}
          </div>
          <div className="flex flex-wrap gap-3">
            {legendChords.map((chord) => (
              <article
                key={chord.name}
                className="flex min-w-[118px] flex-col items-center rounded-2xl border border-edge bg-surface px-3.5 pb-3 pt-3.5"
              >
                <div className="pb-2">
                  <ChordDiagram
                    frets={chord.frets}
                    barres={chord.barres}
                    baseFret={chord.baseFret}
                  />
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
            <ChordDiagram
              frets={popoverChord.frets}
              barres={popoverChord.barres}
              baseFret={popoverChord.baseFret}
            />
          </div>
          <span className="text-[15px] font-extrabold">{popoverChord.name}</span>
          <span className="text-[11.5px] text-sub">{popoverChord.nameEs}</span>
        </div>
      )}

      {/* FAB DE SCROLL */}
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
