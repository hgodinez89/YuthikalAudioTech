import { getTranslations } from "next-intl/server";
import { isFretted, type Instrument } from "@/lib/instruments";
import { SectionNav, type SectionTab } from "./section-nav";

/**
 * Pestañas de Básicos: las secciones de la página (anclas) y, en guitarra y
 * ukelele, el afinador con su propia URL.
 */
export async function BasicsTabs({
  instrument,
  current,
}: {
  instrument: Instrument;
  current: "page" | "tuner";
}) {
  const t = await getTranslations("basics");
  const base = `/${instrument}/basics`;
  // En la página son anclas; desde el afinador vuelven a la página de Básicos.
  const anchor = (id: string): SectionTab =>
    current === "page"
      ? { href: `#${id}`, label: t(id), section: id }
      : { href: `${base}#${id}`, label: t(id) };
  const tabs: SectionTab[] = isFretted(instrument)
    ? [
        anchor("strings"),
        anchor("notes"),
        { href: `${base}/tuner`, label: t("tuner"), current: current === "tuner" },
      ]
    : ["keyboard", "octaves", "fingers", "tones", "notes"].map(anchor);

  return <SectionNav label={t("title")} jumpTo={t("jumpTo")} tabs={tabs} />;
}
