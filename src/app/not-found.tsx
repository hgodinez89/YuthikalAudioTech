import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/button";
import { defaultLocale } from "@/i18n/config";
import "./globals.css";

/* 404 fuera de un idioma (casi nunca: el proxy agrega /es o /en a toda ruta).
   Sin el layout de idioma, trae su propio html. */
export default async function RootNotFound() {
  const t = await getTranslations({ locale: defaultLocale, namespace: "notFound" });
  return (
    <html lang={defaultLocale}>
      <body className="flex min-h-screen items-center justify-center bg-page px-6 text-ink">
        <div className="max-w-[420px] text-center">
          <div className="mb-4 text-[64px] font-extrabold leading-none text-edge-2">
            404
          </div>
          <h1 className="mb-3 text-[22px] font-extrabold">{t("title")}</h1>
          <p className="mb-7 text-[15px] leading-relaxed text-sub">{t("description")}</p>
          <a href={`/${defaultLocale}`} className={buttonClass("primary", "lg")}>
            {t("back")}
          </a>
        </div>
      </body>
    </html>
  );
}
