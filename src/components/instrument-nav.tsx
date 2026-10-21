"use client";

import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  LayoutGrid,
  ListMusic,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SECTIONS, type Instrument, type Section } from "@/lib/instruments";
import { sectionHref } from "@/lib/sections";
import { useIntentPrefetch } from "@/lib/use-intent-prefetch";

export const SECTION_ICONS: Record<Section, LucideIcon> = {
  chords: LayoutGrid,
  scales: ChartNoAxesColumnIncreasing,
  songs: ListMusic,
  basics: BookOpen,
};

/** Barra inferior de secciones en móvil y tablet (al alcance del pulgar). */
export function InstrumentNav({ instrument }: { instrument: Instrument }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Canciones se precarga al tocarla, salvo si ya se está dentro.
  const songsPrefetch = useIntentPrefetch(!pathname.startsWith(`/${instrument}/songs`));

  // Dentro de una canción hay transporte/tabs propios abajo: se oculta.
  if (/^\/[^/]+\/songs\/[^/]+/.test(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] md:hidden">
      {SECTIONS.map((section) => {
        const active = pathname.startsWith(`/${instrument}/${section}`);
        const Icon = SECTION_ICONS[section];
        return (
          <Link
            key={section}
            href={sectionHref(instrument, section)}
            {...(section === "songs" ? songsPrefetch : {})}
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
