"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";

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

/**
 * Tarjeta de login con Google. `next` es la ruta a la que se vuelve tras
 * iniciar sesión; `embedded` la muestra dentro de una página (sin ocupar
 * toda la pantalla), p. ej. en "Mis canciones" sin sesión.
 */
export function LoginCard({
  next = "/",
  embedded = false,
  title,
  subtitle,
  failed: initialFailed = false,
}: {
  next?: string;
  embedded?: boolean;
  title?: string;
  subtitle?: string;
  /** El intento anterior falló (vuelta del callback con ?error). */
  failed?: boolean;
}) {
  const t = useTranslations("auth");
  const [pending, setPending] = useState(false);
  /* Fallo al abrir Google (red) o al volver de él (canje del código). */
  const [failed, setFailed] = useState<"network" | "callback" | null>(
    initialFailed ? "callback" : null,
  );

  /* supabase-js se descarga recién al pulsar (fuera del bundle de la página). */
  const signIn = async () => {
    setPending(true);
    setFailed(null);
    try {
      const { supabaseBrowser } = await import("@/lib/supabase");
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      // Si todo va bien, el navegador ya está yendo a Google.
      if (!error) return;
    } catch {
      /* sin red: el import o la petición fallan */
    }
    setPending(false);
    setFailed("network");
  };

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden px-6 py-10 ${
        embedded ? "" : "min-h-[calc(100vh-71px)]"
      }`}
    >
      {/* glow radial azul tras la card (solo oscuro) */}
      <div className="pointer-events-none absolute -top-[10%] left-1/2 hidden h-[420px] w-[720px] -translate-x-1/2 yk-halo dark:block" />

      <div className="relative w-full max-w-[420px] rounded-3xl yk-raised border border-edge px-9 pb-[34px] pt-11 text-center shadow-card dark:shadow-pop">
        <div className="mx-auto mb-[26px] flex justify-center">
          <BrandLogo height={62} />
        </div>
        <h1 className="mb-2.5 text-[23px] font-extrabold leading-[1.25] tracking-[-0.02em]">
          {title ?? t("title")}
        </h1>
        <p className="mb-[30px] text-[14.5px] leading-[1.55] text-sub">
          {subtitle ?? t("subtitle")}
        </p>

        <button
          type="button"
          onClick={() => void signIn()}
          disabled={pending}
          aria-busy={pending || undefined}
          className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-[13px] bg-white text-[15px] font-semibold text-[#1f2328] border border-edge-2 shadow-card dark:border-transparent transition-colors hover:bg-[#f2f4f7] disabled:cursor-wait disabled:opacity-80"
        >
          <GoogleLogo />
          {pending ? t("redirecting") : t("googleButton")}
        </button>
        {failed && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-warn">
            {t(failed === "network" ? "signInError" : "signInFailed")}
          </p>
        )}

        <div className="mt-[22px] flex items-center justify-center gap-2 text-mute">
          <Lock size={14} strokeWidth={2} />
          <span className="text-[12.5px]">{t("lockNote")}</span>
        </div>
      </div>
    </div>
  );
}
