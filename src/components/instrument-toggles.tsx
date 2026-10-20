"use client";

import { useTranslations } from "next-intl";
import { InstrumentIcon } from "./instrument-icons";
import { INSTRUMENTS, type Instrument } from "@/lib/instruments";
import { sortInstruments } from "@/lib/songs";

/** Selector múltiple de instrumentos (formularios de canción). */
export function InstrumentToggles({
  value,
  onChange,
  label,
}: {
  value: Instrument[];
  onChange: (next: Instrument[]) => void;
  label: string;
}) {
  const t = useTranslations("instruments");
  const toggle = (instrument: Instrument) =>
    onChange(
      sortInstruments(
        value.includes(instrument)
          ? value.filter((i) => i !== instrument)
          : [...value, instrument],
      ),
    );

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {INSTRUMENTS.map((instrument) => {
        const on = value.includes(instrument);
        return (
          <button
            key={instrument}
            type="button"
            onClick={() => toggle(instrument)}
            aria-pressed={on}
            className={
              on
                ? "inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent bg-accent/15 py-1.5 pl-2.5 pr-3.5 text-[13px] font-bold text-accent"
                : "inline-flex cursor-pointer items-center gap-2 rounded-full border border-edge bg-surface-2 py-1.5 pl-2.5 pr-3.5 text-[13px] font-semibold text-sub hover:text-ink"
            }
          >
            <InstrumentIcon name={instrument} size={18} />
            {t(`${instrument}.name`)}
          </button>
        );
      })}
    </div>
  );
}
