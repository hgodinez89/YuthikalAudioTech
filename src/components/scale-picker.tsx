import Link from "next/link";
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

const chip = (active: boolean) =>
  active
    ? "yk-gradient min-w-[46px] shrink-0 rounded-[10px] px-2.5 py-2 text-center text-[13.5px] font-bold"
    : "min-w-[46px] shrink-0 rounded-[10px] border border-edge bg-surface-2 px-2.5 py-2 text-center text-[13.5px] font-semibold text-sub hover:border-edge-2 hover:text-ink";

const pill = (active: boolean) =>
  active
    ? "shrink-0 rounded-full border border-accent bg-accent/15 px-3.5 py-1.5 text-[13px] font-bold text-accent"
    : "shrink-0 rounded-full border border-edge bg-surface-2 px-3.5 py-1.5 text-[13px] font-semibold text-sub hover:text-ink";

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
      <nav
        aria-label={t("pickNote")}
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:flex-wrap"
      >
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
      </nav>
      <nav aria-label={t("pickScale")} className="flex flex-col gap-2">
        {SCALE_CATEGORIES.map((category) => (
          <div
            key={category}
            className="-mx-5 flex items-center gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] sm:flex-wrap"
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
          </div>
        ))}
      </nav>
    </div>
  );
}
