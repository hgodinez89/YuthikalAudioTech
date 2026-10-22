"use client";

import type { ComponentProps } from "react";
import { Link, useRouter } from "@/i18n/navigation";

/*
 * Enlaces de los modos de una canción (libro, karaoke, concierto) que también
 * se usan en la página sin conexión: ahí sus destinos son fragmentos
 * (#/es/guitar/songs/…) y se navega cambiando el fragmento, sin servidor.
 */

/** Link de la app, o un <a> normal si el destino es un fragmento. */
export function AppLink({
  href,
  ...props
}: ComponentProps<typeof Link> & { href: string }) {
  if (href.startsWith("#")) return <a href={href} {...props} />;
  return <Link href={href} {...props} />;
}

/** Navegar por código con la misma regla que AppLink. */
export function useAppNavigate() {
  const router = useRouter();
  return (href: string) => {
    if (href.startsWith("#")) window.location.hash = href.slice(1);
    else router.push(href);
  };
}
