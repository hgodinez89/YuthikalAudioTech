import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeLauncher, type HomeLabels } from "@/components/home-launcher";
import { INSTRUMENTS, SECTIONS } from "@/lib/instruments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  // Utilidad para quien ya usa el sitio: no se indexa (la portada es el recorrido).
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Inicio de regreso: lo abre el logo. Estática; las cookies se leen en el cliente. */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tInstruments = await getTranslations("instruments");
  const tNav = await getTranslations("nav");

  const labels: HomeLabels = {
    instrument: t("instrument"),
    resume: t("resume"),
    replay: t("replay"),
    instruments: Object.fromEntries(
      INSTRUMENTS.map((id) => [id, tInstruments(`${id}.name`)]),
    ) as HomeLabels["instruments"],
    sections: Object.fromEntries(
      SECTIONS.map((s) => [s, tNav(s)]),
    ) as HomeLabels["sections"],
    descs: {
      basics: t("desc.basicsFretted"),
      basicsPiano: t("desc.basicsPiano"),
      chords: t("desc.chords"),
      scales: t("desc.scales"),
      songs: t("desc.songs"),
    },
  };

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col justify-center gap-8 px-5 py-14 outline-none sm:px-8"
    >
      <div className="flex flex-col gap-3">
        <div aria-hidden className="flex h-10 items-end gap-[5px]">
          {[14, 24, 34, 40, 34, 24, 14].map((h, i) => (
            <span
              key={i}
              className="block w-[5px] origin-bottom rounded-[3px]"
              style={{
                height: h,
                background: "linear-gradient(180deg, var(--grad-to), var(--grad-from))",
                animation: "yk-eq 1.1s ease-in-out infinite",
                animationDelay: `${Math.abs(i - 3) * 0.1}s`,
              }}
            />
          ))}
        </div>
        <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
          {t("title")}
        </h1>
        <p className="text-base text-sub">{t("subtitle")}</p>
      </div>
      <HomeLauncher labels={labels} />
    </main>
  );
}
