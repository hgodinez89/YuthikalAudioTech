"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { keepForOffline } from "@/lib/offline-cache";

const ENABLED = process.env.NODE_ENV === "production";

/**
 * Registra el service worker de consulta sin conexión (solo en producción).
 * Sin recarga automática al volver la red (la ofrece ConnectionBanner) y sin
 * el cacheOnNavigation de Serwist (guardaría también rutas privadas): las
 * páginas públicas visitadas se guardan con keepForOffline.
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (ENABLED) void keepForOffline(pathname);
  }, [pathname]);

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={!ENABLED}
      cacheOnNavigation={false}
      reloadOnOnline={false}
      options={{ scope: "/", type: "classic" }}
    >
      {children}
    </SerwistProvider>
  );
}
