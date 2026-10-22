"use client";

import { useTranslations } from "next-intl";

/* Bloque gris tenue que late (quieto con «reducir movimiento»). */
const BONE = "rounded-md bg-edge animate-pulse motion-reduce:animate-none";

/**
 * Esqueleto de "Mis acordes" con la misma estructura que la página (volver,
 * título, contador, buscador y la rejilla de tarjetas): al llegar los datos
 * nada salta de lugar.
 */
export function MyChordsSkeleton() {
  const t = useTranslations("myChords");
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto max-w-[960px] px-5 pb-[90px] pt-8 sm:px-7"
    >
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden>
        <div className={`${BONE} mb-4 h-4 w-32`} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2.5">
            <div className={`${BONE} h-8 w-44`} />
            <div className={`${BONE} h-4 w-56`} />
          </div>
          <div className={`${BONE} h-10 w-40 rounded-xl`} />
        </div>
        <div className={`${BONE} mb-5 h-11 w-full rounded-[11px]`} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 rounded-2xl border border-edge bg-surface px-3 pb-3.5 pt-9"
            >
              {/* Hueco del diagrama (rejilla de cuerdas × trastes) */}
              <div className={`${BONE} h-[112px] w-[88px] rounded-lg`} />
              <div className={`${BONE} h-5 w-12`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
