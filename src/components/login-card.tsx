"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "./brand-logo";
import { supabaseBrowser } from "@/lib/supabase";

/** Logo multicolor oficial de Google (Login.dc.html). */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function LoginCard() {
  const t = useTranslations("auth");

  const signIn = () => {
    supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/playlists` },
    });
  };

  return (
    <div className="relative flex min-h-[calc(100vh-71px)] items-center justify-center overflow-hidden px-6 py-10">
      {/* glow radial azul tras la card (solo oscuro) */}
      <div className="pointer-events-none absolute -top-[10%] left-1/2 hidden h-[420px] w-[720px] -translate-x-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(46,107,240,0.18),transparent_70%)] dark:block" />

      <div className="relative w-full max-w-[420px] rounded-3xl border border-edge bg-surface px-9 pb-[34px] pt-11 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#1f2636] dark:bg-[linear-gradient(180deg,#12151c,#0e1118)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-[26px] flex justify-center">
          <BrandLogo height={62} />
        </div>
        <h1 className="mb-2.5 text-[23px] font-extrabold leading-[1.25] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <p className="mb-[30px] text-[14.5px] leading-[1.55] text-sub">{t("subtitle")}</p>

        <button
          type="button"
          onClick={signIn}
          className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-[13px] bg-white text-[15px] font-semibold text-[#1f2328] shadow-[0_2px_10px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#f2f4f7]"
        >
          <GoogleLogo />
          {t("googleButton")}
        </button>

        <div className="mt-[22px] flex items-center justify-center gap-2 text-mute">
          <Lock size={14} strokeWidth={2} />
          <span className="text-[12.5px]">{t("lockNote")}</span>
        </div>
      </div>
    </div>
  );
}
