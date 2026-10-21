"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { LAST_PAGE_COOKIE, safeLastPage } from "@/lib/last-page";

const YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda la página actual (sin idioma, con su query: ?list=, ?mode=…) para
 * que al volver al sitio el proxy abra ahí. Del lado del cliente porque
 * filtrar playlists cambia la URL sin pasar por el servidor.
 */
export function RememberPage() {
  const pathname = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    const path = safeLastPage(query ? `${pathname}?${query}` : pathname);
    if (path)
      document.cookie = `${LAST_PAGE_COOKIE}=${path}; path=/; max-age=${YEAR}; samesite=lax`;
  }, [pathname, query]);

  return null;
}
