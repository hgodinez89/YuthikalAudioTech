"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Instrument } from "@/lib/instruments";
import { InstrumentIcon } from "./instrument-icons";

/**
 * Final del recorrido: elegir instrumento y empezar por sus Básicos (el
 * proxy lo recuerda al entrar, así la próxima visita ya no muestra el recorrido).
 */
export function TourChooser({
  instruments,
  soon,
}: {
  instruments: { id: Instrument; name: string; cta: string }[];
  soon: { id: string; name: string; label: string }[];
}) {
  const [picked, setPicked] = useState<Instrument>(instruments[0].id);
  const current = instruments.find((i) => i.id === picked) ?? instruments[0];

  return (
    <div className="flex w-full flex-col items-center gap-7">
      <div className="flex flex-wrap justify-center gap-3.5">
        {instruments.map(({ id, name }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPicked(id)}
            aria-pressed={id === picked}
            className={`flex cursor-pointer items-center gap-3 rounded-full border py-3.5 pl-4 pr-6 text-[17px] font-bold transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent ${
              id === picked ? "border-accent bg-accent/10" : "border-edge-2 bg-surface-2"
            }`}
          >
            <span className="text-accent">
              <InstrumentIcon name={id} size={40} />
            </span>
            {name}
          </button>
        ))}
        {soon.map(({ id, name, label }) => (
          <div
            key={id}
            aria-disabled
            className="flex items-center gap-3 rounded-full border border-edge bg-surface-3 py-3.5 pl-4 pr-5 text-[17px] font-bold text-mute"
          >
            <span className="text-disabled">
              <InstrumentIcon name={id} size={40} />
            </span>
            {name}
            <span className="rounded-full border border-accent/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-accent">
              {label}
            </span>
          </div>
        ))}
      </div>
      <Link
        href={`/${current.id}/basics`}
        className="yk-gradient inline-flex items-center gap-2.5 rounded-[14px] px-6 py-3.5 text-base font-bold shadow-fab"
      >
        {current.cta}
        <ArrowRight size={18} strokeWidth={2.4} />
      </Link>
    </div>
  );
}
