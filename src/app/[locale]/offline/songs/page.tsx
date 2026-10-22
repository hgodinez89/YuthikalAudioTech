import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OfflineNotice } from "@/components/offline-notice";
import { OfflineSongs } from "@/components/offline-songs";
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
 * Canciones sin conexión: lista, libro, karaoke y concierto desde lo que el
 * usuario descargó en este dispositivo (IndexedDB). Estática y sin datos:
 * se guarda al descargar la primera canción y el service worker manda aquí
 * las páginas de canciones cuando no hay red (la ruta va en el fragmento).
 */
export default async function OfflineSongsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SectionMessages locale={locale} section="songs">
      <OfflineSongs>
        <OfflineNotice locale={locale} />
      </OfflineSongs>
    </SectionMessages>
  );
}
