import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { InstrumentNav } from "@/components/instrument-nav";
import { INSTRUMENTS, isInstrument } from "@/lib/instruments";

/* Las secciones públicas de cada instrumento se generan en el build. */
export function generateStaticParams() {
  return INSTRUMENTS.map((instrument) => ({ instrument }));
}

/** Shell de cada instrumento: valida el segmento y añade la barra inferior móvil. */
export default async function InstrumentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; instrument: string }>;
}) {
  const { locale, instrument } = await params;
  if (!isInstrument(instrument)) notFound();
  setRequestLocale(locale);

  return (
    <div className="pb-[76px] md:pb-0">
      {children}
      <InstrumentNav instrument={instrument} />
    </div>
  );
}
