import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-10">
      <div className="max-w-[420px] text-center">
        <div className="mb-4 text-[64px] font-extrabold leading-none tracking-[-0.03em] text-edge-2">
          404
        </div>
        <h1 className="mb-3 text-[22px] font-extrabold tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mb-7 text-[15px] leading-relaxed text-sub">{t("description")}</p>
        <Link
          href="/"
          className="yk-gradient inline-flex items-center gap-[9px] rounded-[13px] px-6 py-3 text-[15px] font-bold"
        >
          <ArrowLeft size={17} strokeWidth={2.2} />
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
