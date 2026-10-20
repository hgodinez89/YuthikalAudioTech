"use client";

import { useTranslations } from "next-intl";
import { InstrumentIcon } from "./instrument-icons";
import type { Instrument } from "@/lib/instruments";
import { sortInstruments } from "@/lib/songs";

/** Iconos de los instrumentos de una canción (nada si no hay ninguno). */
export function SongInstruments({
  instruments,
  size = 16,
}: {
  instruments: Instrument[];
  size?: number;
}) {
  const t = useTranslations("instruments");
  if (instruments.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-accent">
      {sortInstruments(instruments).map((instrument) => (
        <span
          key={instrument}
          role="img"
          aria-label={t(`${instrument}.name`)}
          title={t(`${instrument}.name`)}
          className="inline-flex"
        >
          <InstrumentIcon name={instrument} size={size} />
        </span>
      ))}
    </span>
  );
}
