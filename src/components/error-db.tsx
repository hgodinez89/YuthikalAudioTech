"use client";

import { Mail, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

/** Onda "flatline" con latido cian animado (Error DB.dc.html). */
function FlatlineWave() {
  return (
    <svg width="360" height="110" viewBox="0 0 360 110" fill="none" aria-hidden>
      <line
        x1="0"
        y1="55"
        x2="120"
        y2="55"
        stroke="var(--edge-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M120 55 L134 55 L142 26 L152 84 L162 40 L170 55 L184 55"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: "yk-flat-pulse 2.2s ease-in-out infinite" }}
      />
      <line
        x1="184"
        y1="55"
        x2="360"
        y2="55"
        stroke="var(--edge-2)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="330" cy="55" r="5" fill="var(--disabled)" />
    </svg>
  );
}

export function ErrorDb({ onRetry, digest }: { onRetry: () => void; digest?: string }) {
  const t = useTranslations("errorDb");
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-6 py-10">
      <div className="w-full max-w-[520px] text-center">
        <div className="mb-[30px] flex h-[120px] items-center justify-center">
          <FlatlineWave />
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.04em] text-warn">
          <TriangleAlert size={14} strokeWidth={2.2} />
          {t("badge")}
        </div>

        <h1 className="mb-3.5 text-[26px] font-extrabold leading-[1.3] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mx-auto mb-[30px] max-w-[400px] text-[15.5px] leading-relaxed text-sub">
          {t("description")}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-[13px] px-6 py-[13px] text-[15px] font-bold"
          >
            <RotateCcw size={17} strokeWidth={2.2} />
            {t("retry")}
          </button>
          {adminEmail && (
            <a
              href={`mailto:${adminEmail}`}
              className="inline-flex items-center gap-[9px] rounded-[13px] border border-edge-2 bg-surface-2 px-[22px] py-[13px] text-[15px] font-semibold text-ink"
            >
              <Mail size={17} strokeWidth={2} />
              {t("contact")}
            </a>
          )}
        </div>

        {digest && (
          <p className="mt-6 text-xs text-mute">
            {t("errorCode")}: <span className="font-mono">{digest}</span>
          </p>
        )}
      </div>
    </div>
  );
}
