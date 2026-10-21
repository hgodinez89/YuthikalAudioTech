import { Link } from "@/i18n/navigation";
import { chipClass, labelClass } from "./button";
import { FadeRow } from "./fade-row";
import { getLocale, getTranslations } from "next-intl/server";
import { DB_KEYS, ROOT_SHORT_ES } from "@/lib/chords";
import type { Instrument } from "@/lib/instruments";
import {
  SCALE_CATEGORIES,
  SCALES,
  scaleSlug,
  type DbKey,
  type ScaleId,
} from "@/lib/scales";

const chip = (active: boolean) => chipClass({ active, shape: "key" });
const pill = (active: boolean) => chipClass({ active, tone: "accent" });

/**
 * Selector nota → tipo de escala. Cada opción es un enlace: cambiar de
 * escala es navegar (URL compartible, sin estado de cliente).
 */
export async function ScalePicker({
  instrument,
  current,
}: {
  instrument: Instrument;
  current: { key: DbKey; id: ScaleId };
}) {
  const t = await getTranslations("scales");
  const locale = await getLocale();
  const href = (key: DbKey, id: ScaleId) => `/${instrument}/scales/${scaleSlug(key, id)}`;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t("pickNote")}>
        <FadeRow className="-mx-5 -my-1.5 flex items-center gap-1.5 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] sm:flex-wrap">
          <span className={`${labelClass} w-[150px]`}>{t("filterBy")}</span>
          {DB_KEYS.map((key) => (
            <Link
              key={key}
              href={href(key, current.id)}
              aria-current={key === current.key ? "page" : undefined}
              className={chip(key === current.key)}
            >
              {locale === "es" ? ROOT_SHORT_ES[key] : key}
            </Link>
          ))}
        </FadeRow>
      </nav>
      <nav aria-label={t("pickScale")} className="flex flex-col gap-2">
        {SCALE_CATEGORIES.map((category) => (
          <FadeRow
            key={category}
            className="-mx-5 -my-1.5 flex items-center gap-1.5 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] sm:flex-wrap"
          >
            <span className="w-[150px] shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
              {t(`category.${category}`)}
            </span>
            {SCALES.filter((s) => s.category === category).map(({ id }) => (
              <Link
                key={id}
                href={href(current.key, id)}
                aria-current={id === current.id ? "page" : undefined}
                className={pill(id === current.id)}
              >
                {t(`label.${id}`)}
              </Link>
            ))}
          </FadeRow>
        ))}
      </nav>
    </div>
  );
}
