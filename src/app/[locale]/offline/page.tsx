import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfflineChord } from "@/components/offline-chord";
import { OfflineNotice } from "@/components/offline-notice";
import { SectionMessages } from "@/components/section-messages";

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
 * Si era la ficha de un acorde, la pinta desde el catálogo local.
 */
export default async function OfflinePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SectionMessages locale={locale} section="chords">
      <OfflineChord>
        <OfflineNotice locale={locale} />
      </OfflineChord>
    </SectionMessages>
  );
}
