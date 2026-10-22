"use client";

import { Check, ChevronDown, CloudCheck, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, useRouter } from "@/i18n/navigation";
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
import { sectionHref } from "@/lib/sections";
import { useAppPathname } from "@/lib/use-app-pathname";
import { useIntentPrefetch } from "@/lib/use-intent-prefetch";
import { useOnline } from "@/lib/use-online";
import { offlineHash, useOfflineInstruments } from "@/lib/use-offline-instruments";

/**
 * Opciones del menú de instrumento. Con service worker indican cuáles se
 * pueden usar sin conexión y, para los demás, un botón que lleva a su
 * descarga en el inicio (solo con red). Va aparte para comprobar la caché
 * solo con el menú abierto.
 */
function InstrumentOptions({
  instrument,
  children,
}: {
  instrument: Instrument;
  /** Los que vienen (antes de la leyenda, que cierra el menú). */
  children: ReactNode;
}) {
  const t = useTranslations("instruments");
  const tHeader = useTranslations("header");
  const pathname = useAppPathname();
  const router = useRouter();
  const saved = useOfflineInstruments(useLocale());
  const online = useOnline();

  const toDownload = (key: Instrument) => {
    // Ya en el inicio, solo cambia el fragmento (lo escucha el inicio).
    if (pathname === "/home") window.location.hash = offlineHash(key);
    else router.push(`/home${offlineHash(key)}`);
  };

  return (
    <>
      {INSTRUMENTS.map((key) => (
        <div key={key} className="flex items-center gap-1.5 pr-1.5">
          <MenuItem
            href={switchInstrumentPath(pathname, key)}
            checked={key === instrument}
            className={`flex-1 gap-3 rounded-[9px] px-3 py-2.5 text-[14px] font-semibold ${
              key === instrument ? "bg-edge" : ""
            }`}
            icon={
              <span className="text-accent">
                <InstrumentIcon name={key} size={22} />
              </span>
            }
          >
            <span>{t(`${key}.name`)}</span>
            {saved?.[key] && (
              <span title={tHeader("offlineReady")} className="text-accent">
                <CloudCheck size={17} strokeWidth={2} aria-hidden />
                <span className="sr-only">{tHeader("offlineReady")}</span>
              </span>
            )}
            <span className="flex-1" />
            {key === instrument && (
              <Check size={16} strokeWidth={2.4} className="text-accent" />
            )}
          </MenuItem>
          {/* Envuelto: el ancho lo fija el contenedor (MenuItem ocupa todo). */}
          {saved?.[key] === false && (
            <span className="w-8 shrink-0">
              <MenuItem
                onSelect={() => toDownload(key)}
                disabled={!online}
                className={`h-8 justify-center rounded-[8px] border ${
                  online ? "border-edge-2" : "border-edge"
                }`}
              >
                <span
                  title={online ? undefined : tHeader("needsConnection")}
                  className={online ? "text-accent" : "text-disabled"}
                >
                  <Download size={16} strokeWidth={2} aria-hidden />
                </span>
                <span className="sr-only">
                  {tHeader("download", { instrument: t(`${key}.name`) })}
                </span>
              </MenuItem>
            </span>
          )}
        </div>
      ))}
      {children}
      {saved && (
        <div
          aria-hidden
          className="mx-1.5 mb-0.5 mt-1 flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-edge px-1.5 pb-1 pt-2.5 text-[11.5px] text-sub"
        >
          <span className="inline-flex items-center gap-1.5">
            <CloudCheck size={14} strokeWidth={2} className="text-accent" />
            {tHeader("offlineReady")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Download
              size={14}
              strokeWidth={2}
              className={online ? "text-accent" : "text-disabled"}
            />
            {online ? tHeader("legendDownload") : tHeader("needsConnection")}
          </span>
        </div>
      )}
    </>
  );
}

/** Pastilla para cambiar de instrumento conservando la sección actual. */
function InstrumentSwitcher({ instrument }: { instrument: Instrument }) {
  const t = useTranslations("instruments");
  const tHeader = useTranslations("header");
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
      panelClassName="absolute left-0 top-[46px] z-40 w-[280px] overflow-hidden rounded-[14px] border border-edge-2 bg-surface p-1.5 shadow-pop"
    >
      <InstrumentOptions instrument={instrument}>
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
      </InstrumentOptions>
    </Menu>
  );
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = useAppPathname();
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
              const active = pathname.startsWith(`/${instrument}/${section}`);
              const Icon = SECTION_ICONS[section];
              return (
                <Link
                  key={section}
                  href={sectionHref(instrument, section)}
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
