"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
        <UserMenu />
      </div>
    </header>
  );
}
