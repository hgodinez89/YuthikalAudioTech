"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

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

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-edge bg-page/85 px-5 py-3.5 backdrop-blur-[14px]">
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

      <nav className="hidden gap-[26px] text-sm font-medium text-sub sm:flex">
        {NAV.map(({ key, href }) => (
          <Link
            key={key}
            href={href}
            className={pathname.startsWith(href) ? "text-ink" : "hover:text-ink"}
          >
            {t(key)}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
        <LanguageSwitcher />
        <ThemeToggle />
        <Link
          href="/login"
          className="yk-gradient hidden items-center gap-[9px] rounded-[11px] px-4 py-2.5 text-[13.5px] font-bold md:inline-flex"
        >
          <GoogleGlyph />
          {t("signIn")}
        </Link>
      </div>
    </header>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.17v2.98h5.28c-.23 1.5-1.66 4.4-5.28 4.4-3.18 0-5.78-2.63-5.78-5.88s2.6-5.88 5.78-5.88c1.81 0 3.02.77 3.71 1.44l2.53-2.44C17.02 3.7 14.87 2.8 12.18 2.8 7.03 2.8 2.86 6.97 2.86 12.6s4.17 9.8 9.32 9.8c5.38 0 8.94-3.78 8.94-9.1 0-.61-.07-1.08-.17-1.55z" />
    </svg>
  );
}
