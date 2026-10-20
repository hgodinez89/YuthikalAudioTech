"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { RepeatBadge, SheetNote } from "./chord-sheet";
import {
  strumToArrows,
  unitGroups,
  type InstrumentalToken,
  type LyricUnit,
  type VisualSection,
} from "@/lib/chordpro";
import type { SectionTitle } from "@/lib/use-section-title";

export type InstrumentalChord = Extract<InstrumentalToken, { kind: "chord" }>;

/** Lo que edita el selector: una palabra de letra o un acorde de una línea instrumental. */
export type PickerTarget = { lineIndex: number; x: number; y: number } & (
  { unit: LyricUnit; token?: undefined } | { token: InstrumentalChord; unit?: undefined }
);

/* Punto de anclaje del selector: centrado bajo lo que se tocó. */
const anchor = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.bottom + 8 };
};

/**
 * Modo visual del editor: la letra con el mismo ritmo que la vista previa,
 * pero cada palabra (y cada acorde de una línea instrumental) es clicable.
 */
export function VisualEditor({
  sections,
  sectionTitle,
  onPick,
  onStrum,
}: {
  sections: VisualSection[];
  sectionTitle: SectionTitle;
  onPick: (target: PickerTarget) => void;
  onStrum: (headerLineIndex: number, strum: string | null) => void;
}) {
  const t = useTranslations("editor");
  const tSongView = useTranslations("songView");

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-2xl border border-edge bg-surface px-7 py-[26px]">
        <div className="mb-[18px] flex items-center gap-2.5 rounded-[10px] border border-accent/20 bg-accent/[0.06] px-3 py-[9px] text-[12.5px] text-sub">
          <Info size={15} strokeWidth={2} className="shrink-0 text-accent" />
          {t("visualHint")}
        </div>

        {sections.length === 0 && (
          <p className="py-6 text-center text-sm text-tert">{t("visualEmpty")}</p>
        )}

        {sections.map((section, si) => {
          const title = sectionTitle(section);
          const header = section.headerLineIndex;
          return (
            <section key={si} className="mb-7">
              {(title || header !== null) && (
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {title && (
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                      {title}
                    </span>
                  )}
                  {header !== null && (
                    <button
                      type="button"
                      onClick={() => onStrum(header, section.strum)}
                      className="yk-hit-y relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-edge bg-surface-2 px-[11px] py-1 text-xs [--hit:10px] text-sub hover:border-accent"
                    >
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mute">
                        {tSongView("strum")}
                      </span>
                      <span className="tracking-[0.14em]">
                        {section.strum ? strumToArrows(section.strum) : t("strumAdd")}
                      </span>
                    </button>
                  )}
                </div>
              )}
              {/* Mismo ritmo que la vista previa (ChordSheet), pero clicable */}
              <div className="text-lg leading-[1.9]">
                {section.lines.map((line) => (
                  <Fragment key={line.lineIndex}>
                    {line.gapBefore && <div className="h-[1.2em]" />}
                    {line.notesBefore.map((note, ni) => (
                      <SheetNote key={ni} text={note} />
                    ))}
                    {line.instrumental ? (
                      /* Solo acordes: cada acorde clicable; compás y ×N fijos */
                      <div className="mb-1 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                        {line.instrumental.tokens.map((tk, ti) =>
                          tk.kind === "bar" ? (
                            <span key={ti} className="font-light text-edge-2">
                              |
                            </span>
                          ) : tk.kind === "repeat" ? (
                            <RepeatBadge key={ti} times={tk.times} />
                          ) : (
                            <button
                              key={ti}
                              type="button"
                              onClick={(e) =>
                                onPick({
                                  lineIndex: line.lineIndex,
                                  token: tk,
                                  ...anchor(e.currentTarget),
                                })
                              }
                              className="cursor-pointer font-extrabold text-accent underline decoration-edge-2 decoration-dotted underline-offset-4 hover:decoration-accent"
                            >
                              {tk.chord}
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="mb-1 flex flex-wrap items-end">
                        {/* Una palabra con acorde en medio no se parte entre renglones */}
                        {unitGroups(line.units).map((group, gi) => (
                          <span
                            key={gi}
                            className={`inline-flex items-end ${
                              group.at(-1)?.spaceAfter ? "mr-[0.3em]" : ""
                            }`}
                          >
                            {group.map((unit, ui) => (
                              <span
                                key={ui}
                                className="inline-flex flex-col whitespace-pre"
                              >
                                <span className="min-h-[22px] text-sm font-extrabold leading-relaxed tracking-[0.01em] text-accent">
                                  {unit.chord ?? ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    onPick({
                                      lineIndex: line.lineIndex,
                                      unit,
                                      ...anchor(e.currentTarget),
                                    })
                                  }
                                  aria-label={unit.text || unit.chord || undefined}
                                  className="min-w-[1.1em] cursor-pointer text-left underline decoration-edge-2 decoration-dotted underline-offset-4 hover:decoration-accent"
                                >
                                  {/* acorde sin palabra: espacio clicable sin glifo */}
                                  {unit.text || " "}
                                </button>
                              </span>
                            ))}
                          </span>
                        ))}
                      </div>
                    )}
                  </Fragment>
                ))}
                {section.trailingNotes.map((note, ni) => (
                  <SheetNote key={ni} text={note} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
