import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MyChords } from "@/components/my-chords";
import { redirect } from "@/i18n/navigation";
import { CUSTOM_CHORD_COLUMNS } from "@/lib/chord-data";
import type { CustomChordRow } from "@/lib/custom-chords";
import { dbError } from "@/lib/db-error";
import type { Instrument } from "@/lib/instruments";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myChords" });
  // Privada: no se indexa.
  return { title: `${t("title")} — Yuthikal AudioTech`, robots: { index: false } };
}

/** "Mis acordes": la biblioteca personal del instrumento (privada). */
export default async function MyChordsPage({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument: rawInstrument } = await params;
  setRequestLocale(locale);
  // El layout del instrumento ya validó el segmento.
  const instrument = rawInstrument as Instrument;

  const supabase = await supabaseWithSession();
  if (!(await sessionUserId(supabase))) {
    const back = `/${locale}/${instrument}/songs/chords`;
    redirect({ href: `/login?next=${encodeURIComponent(back)}`, locale });
  }

  const { data, error, status } = await supabase
    .from("custom_chords")
    .select(CUSTOM_CHORD_COLUMNS)
    .eq("instrument", instrument)
    .order("name")
    .returns<CustomChordRow[]>();
  if (error) throw dbError(error, status);

  return <MyChords instrument={instrument} chords={data ?? []} />;
}
