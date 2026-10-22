"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { locales } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";
import { offlineTarget } from "@/lib/use-app-pathname";

/** ES / EN: la misma página (con su búsqueda) en el otro idioma. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("header");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const switchTo = (code: (typeof locales)[number]) => {
    // En una página sin conexión, la ruta pedida (va en el fragmento) en el
    // otro idioma: el service worker la vuelve a resolver (p. ej. canciones
    // descargadas). Navegación completa: sin red, Next no puede ir solo.
    const target = offlineTarget();
    if (target) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a propósito: sin red el router de Next no puede navegar.
      window.location.assign(`/${code}${target}`);
      return;
    }
    // La búsqueda se lee al hacer clic (useSearchParams volvería dinámico el header).
    const href = `${pathname}${window.location.search}`;
    startTransition(() => router.replace(href, { locale: code, scroll: false }));
  };

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      aria-busy={pending || undefined}
      className="flex rounded-full border border-edge bg-surface-3 p-[3px] text-xs font-semibold"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => code !== locale && switchTo(code)}
          aria-pressed={locale === code}
          lang={code}
          className={
            locale === code
              ? "yk-gradient yk-hit-y relative rounded-full px-[11px] py-1 [--hit:10px]"
              : "yk-hit-y relative cursor-pointer rounded-full px-[11px] py-1 text-sub [--hit:10px]"
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
