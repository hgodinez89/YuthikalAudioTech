import { notFound } from "next/navigation";
import { InstrumentNav } from "@/components/instrument-nav";
import { isInstrument } from "@/lib/instruments";

/** Shell de cada instrumento: valida el segmento y añade la barra inferior móvil. */
export default async function InstrumentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ instrument: string }>;
}) {
  const { instrument } = await params;
  if (!isInstrument(instrument)) notFound();

  return (
    <div className="pb-[76px] md:pb-0">
      {children}
      <InstrumentNav instrument={instrument} />
    </div>
  );
}
