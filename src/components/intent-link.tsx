"use client";

import { useRef, type ComponentProps } from "react";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Enlace que se precarga solo cuando el usuario muestra intención (cursor,
 * toque o foco), no al entrar en pantalla: para listas de enlaces a páginas
 * que se generan bajo demanda, sin despertar al servidor por cada una.
 * (Cambiar `prefetch` de false a true no basta: Next no vuelve a evaluar un
 * enlace que ya estaba visible; por eso se pide con router.prefetch.)
 */
export function IntentLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string }) {
  const router = useRouter();
  const done = useRef(false);
  const prefetch = () => {
    if (done.current) return;
    done.current = true;
    router.prefetch(href);
  };
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      onFocus={prefetch}
    />
  );
}
