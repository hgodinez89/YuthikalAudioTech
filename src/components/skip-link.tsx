"use client";

import { useTranslations } from "next-intl";

/** Primer elemento con Tab: salta el header hasta el contenido (`#main`). */
export function SkipLink() {
  const t = useTranslations("nav");
  return (
    <a
      href="#main"
      className="yk-gradient sr-only text-sm font-bold focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:px-4 focus:py-2.5 focus:shadow-pop"
    >
      {t("skipToContent")}
    </a>
  );
}
