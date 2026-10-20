import { redirect } from "@/i18n/navigation";

export default async function InstrumentHome({
  params,
}: {
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument } = await params;
  redirect({ href: `/${instrument}/chords`, locale });
}
