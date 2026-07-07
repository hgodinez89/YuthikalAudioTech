"use client";

import { ChevronLeft, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

const NAV = [
  { key: "instruments", href: "/guitar" },
  { key: "chords", href: "/guitar/chords" },
  { key: "playlists", href: "/playlists" },
] as const;

export function SiteHeader() {
  const t = useTranslations("header");
  const tInstruments = useTranslations("instruments");
  const pathname = usePathname();
  const inGuitarSection = pathname.startsWith("/guitar/");
  const [menuOpen, setMenuOpen] = useState(false);

  // Cierra el panel móvil al cambiar de ruta (p. ej. al tocar el logo o el
  // avatar) ajustando el estado durante el render, sin efecto.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-page/85 backdrop-blur-[14px]">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" aria-label="Yuthikal AudioTech">
            <BrandLogo />
          </Link>
          {inGuitarSection && (
            <Link
              href="/guitar"
              className="flex items-center gap-2 whitespace-nowrap text-[13px] text-tert hover:text-ink"
            >
              <ChevronLeft size={15} strokeWidth={2} />
              {tInstruments("guitar.name")}
            </Link>
          )}
        </div>

        {/* Nav de escritorio */}
        <nav className="hidden gap-[26px] text-sm font-medium text-sub sm:flex">
          {NAV.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className={isActive(href) ? "text-ink" : "hover:text-ink"}
            >
              {t(key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Botón hamburguesa (solo móvil) */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("menu")}
            aria-expanded={menuOpen}
            className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] border border-edge bg-surface-3 text-sub sm:hidden"
          >
            {menuOpen ? (
              <X size={18} strokeWidth={2} />
            ) : (
              <Menu size={18} strokeWidth={2} />
            )}
          </button>
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Panel de navegación móvil */}
      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-edge px-3 py-2.5 sm:hidden">
          {NAV.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={
                isActive(href)
                  ? "rounded-[10px] bg-edge px-3 py-2.5 text-[15px] font-semibold text-ink"
                  : "rounded-[10px] px-3 py-2.5 text-[15px] font-medium text-sub hover:bg-edge hover:text-ink"
              }
            >
              {t(key)}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
