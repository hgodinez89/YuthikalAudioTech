"use client";

import { RefreshCw, WifiOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useOnline } from "@/lib/use-online";

/**
 * «Reintentar» de la página sin conexión: vuelve a la dirección que se quiso
 * abrir (el service worker la deja en el fragmento: /es/offline#/es/…).
 * Solo rutas del propio sitio; si no hay, recarga.
 */
export function ReloadButton({ label }: { label: string }) {
  const retry = () => {
    const target = window.location.hash.slice(1);
    if (target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")) {
      window.location.assign(target);
    } else {
      window.location.reload();
    }
  };
  return (
    <button
      type="button"
      onClick={retry}
      className="yk-gradient inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-[11px] text-sm font-bold"
    >
      <RefreshCw size={15} strokeWidth={2.2} />
      {label}
    </button>
  );
}

/**
 * Aviso bajo el header: sin conexión (solo consulta) y, al volver la red,
 * «Conexión restablecida · Actualizar». No recarga solo: si estabas en el
 * karaoke, no se interrumpe.
 */
export function ConnectionBanner() {
  const t = useTranslations("offline");
  const online = useOnline();
  /* ¿Se perdió la conexión en esta visita? Se marca en el render (sin efecto). */
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!online && !wasOffline) setWasOffline(true);
  if (!online && dismissed) setDismissed(false);

  if (online && (!wasOffline || dismissed)) return null;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b px-4 py-2 text-center text-[13px] font-semibold ${
        online
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-warn/30 bg-warn/10 text-warn"
      }`}
    >
      {online ? (
        <>
          <span>{t("back")}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-accent/40 px-3 py-1 hover:bg-accent/15"
          >
            <RefreshCw size={13} strokeWidth={2.2} />
            {t("refresh")}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("dismiss")}
            className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-accent/15"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </>
      ) : (
        <>
          <WifiOff size={15} strokeWidth={2.2} aria-hidden />
          <span>{t("banner")}</span>
        </>
      )}
    </div>
  );
}
