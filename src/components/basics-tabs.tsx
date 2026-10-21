import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isFretted, type Instrument } from "@/lib/instruments";

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
  // Desde el afinador, las secciones vuelven a la página de Básicos.
  const anchor = (id: string) => (current === "page" ? `#${id}` : `${base}#${id}`);
  const tabs = isFretted(instrument)
    ? [
        { href: anchor("strings"), label: t("strings"), active: false },
        { href: anchor("notes"), label: t("notes"), active: false },
        { href: `${base}/tuner`, label: t("tuner"), active: current === "tuner" },
      ]
    : [
        { href: anchor("keyboard"), label: t("keyboard"), active: false },
        { href: anchor("fingers"), label: t("fingers"), active: false },
        { href: anchor("notes"), label: t("notes"), active: false },
      ];

  return (
    <nav
      aria-label={t("title")}
      className="flex w-fit rounded-xl border border-edge bg-surface-2 p-1 text-[13px] font-semibold"
    >
      {tabs.map((tab) =>
        tab.href.startsWith("#") ? (
          <a
            key={tab.href}
            href={tab.href}
            className="rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
          >
            {tab.label}
          </a>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={
              tab.active
                ? "yk-gradient rounded-[9px] px-[15px] py-[7px]"
                : "rounded-[9px] px-[15px] py-[7px] text-sub hover:text-ink"
            }
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}
