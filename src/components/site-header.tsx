"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { InstrumentIcon } from "./instrument-icons";
import { SECTION_ICONS } from "./instrument-nav";
import { UserMenu } from "./user-menu";
import {
  COMING_SOON,
  INSTRUMENTS,
  isInstrument,
  SECTIONS,
  switchInstrumentPath,
  type Instrument,
} from "@/lib/instruments";

/** Pastilla para cambiar de instrumento conservando la sección actual. */
function InstrumentSwitcher({ instrument }: { instrument: Instrument }) {
  const t = useTranslations("instruments");
  const tHeader = useTranslations("header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú al navegar, ajustando el estado durante el render.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={tHeader("switchInstrument")}
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 rounded-full border border-edge-2 bg-surface-2 py-1.5 pl-2.5 pr-2 text-[13.5px] font-semibold"
      >
        <span className="text-accent">
          <InstrumentIcon name={instrument} size={20} />
        </span>
        {t(`${instrument}.name`)}
        <ChevronDown size={15} strokeWidth={2} className="text-sub" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[46px] z-40 w-[240px] overflow-hidden rounded-[14px] border border-edge-2 bg-surface p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.6)]">
            {INSTRUMENTS.map((key) => (
              <Link
                key={key}
                href={switchInstrumentPath(pathname, key)}
                className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[14px] font-semibold hover:bg-edge"
              >
                <span className="text-accent">
                  <InstrumentIcon name={key} size={22} />
                </span>
                <span className="flex-1">{t(`${key}.name`)}</span>
                {key === instrument && (
                  <Check size={16} strokeWidth={2.4} className="text-accent" />
                )}
              </Link>
            ))}
            {COMING_SOON.map((key) => (
              <div
                key={key}
                aria-disabled
                className="flex cursor-not-allowed items-center gap-3 rounded-[9px] px-3 py-2.5 text-[14px] font-semibold text-mute"
              >
                <span className="text-disabled">
                  <InstrumentIcon name={key} size={22} />
                </span>
                <span className="flex-1">{t(`${key}.name`)}</span>
                <span className="rounded-full border border-accent/35 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-accent">
                  {t("soon")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const segment = pathname.split("/")[1];
  const instrument = isInstrument(segment) ? segment : null;

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-page/85 backdrop-blur-[14px]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={instrument ? `/${instrument}` : "/"}
            aria-label="Yuthikal AudioTech"
            className="shrink-0"
          >
            <BrandLogo />
          </Link>
          {instrument && <InstrumentSwitcher instrument={instrument} />}
        </div>

        {/* Secciones del instrumento (en móvil viven en la barra inferior) */}
        {instrument && (
          <nav className="hidden gap-1 text-sm font-semibold text-sub sm:flex">
            {SECTIONS.map((section) => {
              const href = `/${instrument}/${section}`;
              const active = pathname.startsWith(href);
              const Icon = SECTION_ICONS[section];
              return (
                <Link
                  key={section}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-[10px] px-3 py-2 ${
                    active ? "bg-edge text-ink" : "hover:text-ink"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={2}
                    className={active ? "text-accent" : ""}
                  />
                  {t(section)}
                </Link>
              );
            })}
          </nav>
        )}

        <UserMenu />
      </div>
    </header>
  );
}
