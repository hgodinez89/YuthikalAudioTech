"use client";

import { useTranslations } from "next-intl";
import { BrandLogo } from "./brand-logo";

const BAR_COUNT = 44;

/**
 * Ecualizador del handoff (Loading.dc.html): 44 barras con envolvente
 * senoidal (altas al centro), jitter determinista y "respiración" que se
 * propaga del centro hacia afuera vía animation-delay.
 */
function EqualizerBars() {
  return (
    <div className="flex h-[84px] items-center justify-center gap-1">
      {Array.from({ length: BAR_COUNT }, (_, i) => {
        const t = i / (BAR_COUNT - 1);
        const envelope = Math.sin(t * Math.PI);
        const jitter = 0.72 + 0.28 * Math.abs(Math.sin(i * 1.7));
        const height = Math.max(6, Math.round((10 + envelope * 62) * jitter));
        const delay = (Math.abs(t - 0.5) * 2 * 0.5).toFixed(2);
        return (
          <span
            key={i}
            className="block w-[5px] origin-center rounded-[3px]"
            style={{
              height,
              background: "linear-gradient(180deg, var(--grad-to), var(--grad-from))",
              animation: "yk-eq 1.1s ease-in-out infinite",
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function LoadingScreen({ message }: { message?: string }) {
  const t = useTranslations("loading");

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 py-10">
      <div className="flex flex-col items-center gap-[34px] [animation:yk-fade-up_.5s_ease_both]">
        <div className="flex h-[70px] items-center">
          <BrandLogo height={70} />
        </div>
        <EqualizerBars />
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            {t("eyebrow")}
          </span>
          <span className="text-[14.5px] text-sub">{message ?? t("message")}</span>
        </div>
      </div>
    </div>
  );
}
