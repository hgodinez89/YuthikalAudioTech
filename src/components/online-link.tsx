"use client";

import { useTranslations } from "next-intl";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { useOnline } from "@/lib/use-online";

/**
 * Enlace a una acción que necesita conexión (editar): sin red se ve igual,
 * pero desactivado y con el motivo.
 */
export function OnlineLink({
  className = "",
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const t = useTranslations("offline");
  if (useOnline()) {
    return (
      <Link className={className} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <span
      role="link"
      aria-disabled="true"
      title={t("unavailable")}
      className={`${className} cursor-not-allowed opacity-60`}
    >
      {children}
    </span>
  );
}
