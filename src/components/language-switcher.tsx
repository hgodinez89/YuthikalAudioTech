"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { locales } from "@/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("header");
  const [, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("switchLanguage")}
      className="flex rounded-full border border-edge bg-surface-3 p-[3px] text-xs font-semibold"
    >
      {locales.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => startTransition(() => setLocale(code))}
          aria-pressed={locale === code}
          className={
            locale === code
              ? "yk-gradient rounded-full px-[11px] py-1"
              : "cursor-pointer rounded-full px-[11px] py-1 text-sub"
          }
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
