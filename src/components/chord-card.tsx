import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChordVisual } from "./chord-visual";
import type { ChordPositionRow } from "@/lib/chords";

export type ChordCardData = {
  id: string;
  name_en: string;
  name_es: string;
  position: Pick<ChordPositionRow, "base_fret" | "frets" | "barres">;
  /** Piano: teclas del acorde (en lugar de la posición en el mástil). */
  keys?: number[];
};

export function ChordCard({ chord, href }: { chord: ChordCardData; href: string }) {
  const t = useTranslations("finder");
  const hasBarre = !chord.keys && chord.position.barres.length > 0;

  return (
    <Link
      href={href}
      className="relative flex flex-col items-center rounded-2xl border border-edge bg-surface px-3 pb-3.5 pt-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_10px_26px_rgba(15,165,190,0.14)] dark:shadow-none"
    >
      {hasBarre && (
        <span className="absolute right-2.5 top-2.5 rounded-full border border-accent/40 px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] text-accent">
          {t("barre")}
        </span>
      )}
      <div className="flex w-full justify-center pb-2.5 pt-1">
        <ChordVisual
          chord={{
            frets: chord.position.frets,
            barres: chord.position.barres,
            baseFret: chord.position.base_fret,
            keys: chord.keys,
          }}
          scale={chord.keys ? 1.15 : 1}
        />
      </div>
      <div className="text-center leading-[1.35]">
        <span className="text-[17px] font-extrabold tracking-[-0.01em]">
          {chord.name_en}
        </span>
        <div className="text-[12.5px] text-sub">{chord.name_es}</div>
      </div>
    </Link>
  );
}
