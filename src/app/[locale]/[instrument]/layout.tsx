import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { InstrumentNav } from "@/components/instrument-nav";
import { RememberPage } from "@/components/remember-page";
import { INSTRUMENTS, isInstrument } from "@/lib/instruments";

/* Las secciones públicas de cada instrumento se generan en el build. */
export function generateStaticParams() {
  return INSTRUMENTS.map((instrument) => ({ instrument }));
}

/**
 * Shell de cada instrumento: valida el segmento, añade la barra inferior
 * móvil y recuerda la página para volver a ella.
 */
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
    <div className="flex-1 pb-[76px] md:pb-0">
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <InstrumentNav instrument={instrument} />
      {/* useSearchParams: sin Suspense, las páginas estáticas dejarían de serlo. */}
      <Suspense fallback={null}>
        <RememberPage />
      </Suspense>
    </div>
  );
}
