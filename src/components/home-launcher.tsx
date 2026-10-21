"use client";

import { ArrowRight, CloudCheck, CloudOff, RotateCcw } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import {
  INSTRUMENT_COOKIE,
  INSTRUMENTS,
  isFretted,
  isInstrument,
  SECTIONS,
  type Instrument,
  type Section,
} from "@/lib/instruments";
import { LAST_PAGE_COOKIE, lastPageParts, safeLastPage } from "@/lib/last-page";
import { sectionHref } from "@/lib/sections";
import { parseOfflineHash, useOfflineInstruments } from "@/lib/use-offline-instruments";
import { InstrumentIcon } from "./instrument-icons";
import { SECTION_ICONS } from "./instrument-nav";
import { OfflineDownload, type DownloadLabels } from "./offline-download";

function readCookie(name: string): string | null {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

const noopSubscribe = () => () => {};

/** Cookie leída tras hidratar (en el servidor y al hidratar, null). */
function useCookie(name: string) {
  return useSyncExternalStore(
    noopSubscribe,
    () => readCookie(name),
    () => null,
  );
}

export type HomeLabels = {
  instrument: string;
  resume: string;
  replay: string;
  instruments: Record<Instrument, string>;
  sections: Record<Section, string>;
  descs: Record<Section, string> & { basicsPiano: string };
  download: DownloadLabels;
  offline: { ready: string; missing: string };
};

/**
 * Inicio de regreso (el logo): elegir instrumento y entrar directo a una
 * sección, o seguir en la última página visitada.
 */
export function HomeLauncher({ labels }: { labels: HomeLabels }) {
  const locale = useLocale();
  const savedInstrument = useCookie(INSTRUMENT_COOKIE);
  const last = safeLastPage(useCookie(LAST_PAGE_COOKIE));
  const [picked, setPicked] = useState<Instrument | null>(null);
  const current =
    picked ?? (isInstrument(savedInstrument) ? savedInstrument : INSTRUMENTS[0]);
  const lastParts = last ? lastPageParts(last) : null;
  const saved = useOfflineInstruments(locale);
  const [highlight, setHighlight] = useState(false);

  // «Descargar» del menú de instrumento: /home#offline-piano elige ese
  // instrumento y lleva a su tarjeta de descarga.
  useEffect(() => {
    const onHash = () => {
      const target = parseOfflineHash(window.location.hash);
      if (!target) return;
      setPicked(target);
      setHighlight(true);
      history.replaceState(history.state, "", window.location.pathname);
    };
    const frame = requestAnimationFrame(onHash);
    window.addEventListener("hashchange", onHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const cardShown = saved !== null;
  useEffect(() => {
    if (!highlight || !cardShown) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`offline-${current}`)
      ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    const timer = setTimeout(() => setHighlight(false), 2500);
    return () => clearTimeout(timer);
  }, [highlight, cardShown, current]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div
          role="group"
          aria-label={labels.instrument}
          className="flex w-fit flex-wrap rounded-[14px] border border-edge bg-surface-3 p-[5px]"
        >
          {INSTRUMENTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPicked(id)}
              aria-pressed={id === current}
              className={`relative flex cursor-pointer items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold ${
                id === current ? "yk-gradient" : "text-sub hover:text-ink"
              }`}
            >
              <InstrumentIcon name={id} size={22} />
              {labels.instruments[id]}
              {saved?.[id] !== undefined && (
                <span
                  title={saved[id] ? labels.offline.ready : labels.offline.missing}
                  className="absolute -right-[7px] -top-[7px] grid size-5 place-items-center rounded-full border border-edge-2 bg-surface-3"
                >
                  {saved[id] ? (
                    <CloudCheck size={12} strokeWidth={2.4} className="text-accent" />
                  ) : (
                    <CloudOff size={12} strokeWidth={2.4} className="text-mute" />
                  )}
                  <span className="sr-only">
                    {saved[id] ? labels.offline.ready : labels.offline.missing}
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
        {saved && (
          <div
            aria-hidden
            className="flex flex-wrap gap-x-[18px] gap-y-1 text-[12.5px] text-sub"
          >
            <span className="inline-flex items-center gap-1.5">
              <CloudCheck size={14} strokeWidth={2} className="text-accent" />
              {labels.offline.ready}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CloudOff size={14} strokeWidth={2} className="text-mute" />
              {labels.offline.missing}
            </span>
          </div>
        )}
      </div>

      {last && lastParts && (
        <Link
          href={last}
          className="flex items-center gap-3.5 rounded-[14px] border border-accent/30 bg-accent/[0.06] px-[18px] py-3.5 hover:border-accent"
        >
          <RotateCcw size={18} strokeWidth={2} className="shrink-0 text-accent" />
          <span className="flex-1 text-[15px]">
            <span className="text-sub">{labels.resume}</span>{" "}
            <strong>
              {lastParts.section ? `${labels.sections[lastParts.section]} · ` : ""}
              {labels.instruments[lastParts.instrument]}
            </strong>
          </span>
          <ArrowRight size={18} strokeWidth={2} className="shrink-0 text-sub" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section];
          return (
            <Link
              key={section}
              href={sectionHref(current, section)}
              className="yk-raised flex flex-col gap-3 rounded-[18px] border border-edge-2 p-[22px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-accent"
            >
              <Icon size={26} strokeWidth={2} className="text-accent" />
              <span className="text-lg font-bold">{labels.sections[section]}</span>
              <span className="text-[13px] leading-normal text-sub">
                {section === "basics" && !isFretted(current)
                  ? labels.descs.basicsPiano
                  : labels.descs[section]}
              </span>
            </Link>
          );
        })}
      </div>

      {saved && (
        <OfflineDownload
          locale={locale}
          instrument={current}
          saved={saved}
          highlight={highlight}
          labels={labels.download}
        />
      )}

      <Link href="/?tour=1" className="self-center text-[13px] text-tert hover:text-ink">
        {labels.replay}
      </Link>
    </div>
  );
}
