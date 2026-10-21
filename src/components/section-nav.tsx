"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { labelClass } from "./button";
import { FadeRow } from "./fade-row";

export type SectionTab = {
  href: string;
  label: string;
  /** Id de la sección de esta misma página a la que salta (ancla). */
  section?: string;
  /** Página actual cuando la pestaña es otra URL (p. ej. el afinador). */
  current?: boolean;
};

const TAB = "whitespace-nowrap rounded-[9px] px-[15px] py-[7px] transition-colors";
const IDLE = `${TAB} text-sub hover:text-ink`;

/**
 * Barra fija «Ir a»: las anclas resaltan la sección que se está leyendo;
 * una pestaña con otra URL usa el degradado de «estás aquí».
 */
export function SectionNav({
  label,
  jumpTo,
  tabs,
}: {
  label: string;
  jumpTo: string;
  tabs: SectionTab[];
}) {
  const ids = tabs.flatMap((tab) => (tab.section ? [tab.section] : [])).join(" ");
  const [visible, setVisible] = useState<string | null>(ids.split(" ")[0] || null);

  useEffect(() => {
    if (!ids) return;
    const order = ids.split(" ");
    const inBand = new Set<string>();
    // Franja bajo el header y esta barra: gana la primera sección dentro.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target.id);
          else inBand.delete(entry.target.id);
        }
        const first = order.find((id) => inBand.has(id));
        if (first) setVisible(first);
      },
      { rootMargin: "-150px 0px -55% 0px" },
    );
    for (const id of order) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);

  return (
    // El fondo cubre también el margen lateral del contenedor de la página.
    <div className="sticky top-[71px] z-20 -mx-5 mb-5 px-5 pb-3 pt-2 [background:linear-gradient(var(--page)_80%,transparent)] sm:-mx-7 sm:px-7">
      <FadeRow className="-mx-5 flex items-center gap-3 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <span className={labelClass}>{jumpTo}</span>
        <nav
          aria-label={label}
          className="flex shrink-0 rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold"
        >
          {tabs.map((tab) =>
            tab.section ? (
              <a
                key={tab.href}
                href={tab.href}
                aria-current={visible === tab.section ? "location" : undefined}
                className={
                  visible === tab.section
                    ? `${TAB} bg-surface-3 text-ink shadow-[inset_0_-2px_0_var(--accent)]`
                    : IDLE
                }
              >
                {tab.label}
              </a>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.current ? "page" : undefined}
                className={tab.current ? `${TAB} yk-gradient` : IDLE}
              >
                {tab.label}
              </Link>
            ),
          )}
        </nav>
      </FadeRow>
    </div>
  );
}
