"use client";

import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogo } from "./brand-logo";
import { InstrumentIcon } from "./instrument-icons";
import { SECTION_ICONS } from "./instrument-nav";
import { Menu, MenuItem } from "./menu";
import { UserMenu } from "./user-menu";
import {
  COMING_SOON,
  INSTRUMENTS,
  isInstrument,
  SECTIONS,
  switchInstrumentPath,
  type Instrument,
} from "@/lib/instruments";
import { useIntentPrefetch } from "@/lib/use-intent-prefetch";

/** Pastilla para cambiar de instrumento conservando la sección actual. */
function InstrumentSwitcher({ instrument }: { instrument: Instrument }) {
  const t = useTranslations("instruments");
  const tHeader = useTranslations("header");
  const pathname = usePathname();
  const label = `${t(`${instrument}.name`)} · ${tHeader("switchInstrument")}`;

  return (
    <Menu
      label={tHeader("switchInstrument")}
      trigger={{
        "aria-label": label,
        className:
          "flex cursor-pointer items-center gap-2 rounded-full border border-edge-2 bg-surface-2 py-1.5 pl-2.5 pr-2 text-[13.5px] font-semibold",
        children: (
          <>
            <span className="text-accent">
              <InstrumentIcon name={instrument} size={20} />
            </span>
            {t(`${instrument}.name`)}
            <ChevronDown size={15} strokeWidth={2} className="text-sub" />
          </>
        ),
      }}
      panelClassName="absolute left-0 top-[46px] z-40 w-[240px] overflow-hidden rounded-[14px] border border-edge-2 bg-surface p-1.5 shadow-pop"
    >
      {INSTRUMENTS.map((key) => (
        <MenuItem
          key={key}
          href={switchInstrumentPath(pathname, key)}
          checked={key === instrument}
          className="gap-3 rounded-[9px] px-3 py-2.5 text-[14px] font-semibold"
          icon={
            <span className="text-accent">
              <InstrumentIcon name={key} size={22} />
            </span>
          }
        >
          <span className="flex-1">{t(`${key}.name`)}</span>
          {key === instrument && (
            <Check size={16} strokeWidth={2.4} className="text-accent" />
          )}
        </MenuItem>
      ))}
      {COMING_SOON.map((key) => (
        <MenuItem
          key={key}
          disabled
          className="gap-3 rounded-[9px] px-3 py-2.5 text-[14px] font-semibold"
          icon={
            <span className="text-disabled">
              <InstrumentIcon name={key} size={22} />
            </span>
          }
        >
          <span className="flex-1">{t(`${key}.name`)}</span>
          <span className="rounded-full border border-accent/35 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-accent">
            {t("soon")}
          </span>
        </MenuItem>
      ))}
    </Menu>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const segment = pathname.split("/")[1];
  const instrument = isInstrument(segment) ? segment : null;
  // Canciones se precarga al pasar el cursor, salvo si ya se está dentro.
  const songsPrefetch = useIntentPrefetch(
    instrument !== null && !pathname.startsWith(`/${instrument}/songs`),
  );
  // Recorrido e inicio: header y página se ven como una sola superficie.
  const seamless = pathname === "/" || pathname === "/home";

  return (
    <header
      className={`sticky top-0 z-40 bg-page/85 backdrop-blur-[14px] ${
        seamless ? "" : "border-b border-edge"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {/* El logo abre el inicio de regreso (cambiar de instrumento, seguir donde quedaste). */}
          <Link href="/home" aria-label="Yuthikal AudioTech" className="shrink-0">
            <BrandLogo />
          </Link>
          {instrument && <InstrumentSwitcher instrument={instrument} />}
        </div>

        {/* Secciones del instrumento (en móvil y tablet viven en la barra inferior) */}
        {instrument && (
          <nav className="hidden gap-1 text-sm font-semibold text-sub md:flex">
            {SECTIONS.map((section) => {
              const href = `/${instrument}/${section}`;
              const active = pathname.startsWith(href);
              const Icon = SECTION_ICONS[section];
              return (
                <Link
                  key={section}
                  href={href}
                  {...(section === "songs" ? songsPrefetch : {})}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-[10px] px-3 py-2 ${
                    active ? "bg-edge text-ink" : "hover:text-ink"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={2}
                    className={`hidden lg:block ${active ? "text-accent" : ""}`}
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
