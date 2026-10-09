"use client";

import { BookOpen, LayoutGrid, ListMusic, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SECTIONS, type Instrument, type Section } from "@/lib/instruments";

export const SECTION_ICONS: Record<Section, LucideIcon> = {
  chords: LayoutGrid,
  songs: ListMusic,
  basics: BookOpen,
};

/** Barra inferior de secciones en móvil (al alcance del pulgar). */
export function InstrumentNav({ instrument }: { instrument: Instrument }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  // Dentro de una canción hay transporte/tabs propios abajo: se oculta.
  if (/^\/[^/]+\/songs\/[^/]+/.test(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] sm:hidden">
      {SECTIONS.map((section) => {
        const href = `/${instrument}/${section}`;
        const active = pathname.startsWith(href);
        const Icon = SECTION_ICONS[section];
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11.5px] font-semibold ${
              active ? "text-accent" : "text-tert"
            }`}
          >
            <Icon size={21} strokeWidth={2} />
            {t(section)}
          </Link>
        );
      })}
    </nav>
  );
}
