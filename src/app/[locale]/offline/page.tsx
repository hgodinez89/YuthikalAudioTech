import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/button";
import { ReloadButton } from "@/components/connection-banner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "offline" });
  return { title: t("pageTitle"), robots: { index: false } };
}

/**
 * Respaldo sin conexión: el service worker la precarga y la muestra cuando
 * se abre una página que no está guardada. Estática y legible sin JS.
 */
export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("offline");

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center outline-none"
    >
      <div className="grid size-16 place-items-center rounded-2xl border border-edge-2 bg-surface-2 text-warn">
        <WifiOff size={28} strokeWidth={2} />
      </div>
      <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">{t("title")}</h1>
      <p className="leading-relaxed text-sub">{t("desc")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ReloadButton label={t("retry")} />
        {/* Enlace normal (no navegación de Next): sin red, la página completa
            la sirve el service worker desde la precarga. */}
        <a href={`/${locale}/home`} className={buttonClass("secondary")}>
          {t("home")}
        </a>
      </div>
    </main>
  );
}
