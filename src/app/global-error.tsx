"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type es from "../../messages/es.json";
import "./globals.css";

type Texts = (typeof es)["errorPage"];

/* Reemplaza al layout del idioma cuando falla él mismo: sin proveedores de
   textos ni de tema, así que los toma directamente (idioma de la URL, tema
   guardado por next-themes o el del sistema). Los textos se descargan solo
   si se llega a mostrar. */
const subscribe = () => () => {};

function readEnv() {
  const locale = window.location.pathname.startsWith("/en") ? "en" : "es";
  let theme: string | null = null;
  try {
    theme = window.localStorage.getItem("theme");
  } catch {}
  const dark =
    theme === "dark" ||
    (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return `${locale}:${dark ? "dark" : "light"}`;
}

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const env = useSyncExternalStore(subscribe, readEnv, () => "es:light");
  const [locale, theme] = env.split(":") as ["es" | "en", "dark" | "light"];
  const [t, setTexts] = useState<Texts | null>(null);
  useEffect(() => {
    const load =
      locale === "en"
        ? import("../../messages/en.json")
        : import("../../messages/es.json");
    void load.then((m) => setTexts(m.default.errorPage)).catch(() => {});
  }, [locale]);

  return (
    <html lang={locale} className={theme === "dark" ? "dark" : ""}>
      <body className="flex min-h-screen items-center justify-center bg-page px-6 py-10 font-sans text-ink">
        {t && <title>{t.generic.title}</title>}
        {t && (
          <main className="w-full max-w-[460px] text-center">
            <h1 className="mb-3.5 text-[26px] font-extrabold leading-[1.3] tracking-[-0.02em]">
              {t.generic.title}
            </h1>
            <p className="mb-[30px] text-[15.5px] leading-relaxed text-sub">
              {t.generic.description}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => retry()}
                className="yk-gradient min-h-11 cursor-pointer rounded-xl px-6 py-3 text-[15px] font-bold"
              >
                {t.retry}
              </button>
              <a
                href={`/${locale}`}
                className="min-h-11 rounded-xl border border-edge-2 bg-surface-2 px-6 py-3 text-[15px] font-semibold"
              >
                {t.home}
              </a>
            </div>
            {error.digest && (
              <p className="mt-6 text-xs text-mute">
                {t.errorCode}: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </main>
        )}
      </body>
    </html>
  );
}
