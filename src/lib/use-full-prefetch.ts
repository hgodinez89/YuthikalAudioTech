"use client";

import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

/*
 * Precarga COMPLETA de una página dinámica (datos incluidos): la precarga
 * normal de Next solo trae su esqueleto (hasta su loading.js). Next la guarda
 * unos minutos, así que si se entra en ese rato aparece al instante.
 */
const FULL = "full" as PrefetchKind;

const saveData = () =>
  Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData,
  );

/**
 * Devuelve `prefetch()` para llamarlo al mostrar intención (cursor, toque,
 * foco) y, con `idle`, además la pide en segundo plano cuando el navegador
 * queda libre. Una vez por página; nunca sin red ni con «ahorro de datos».
 */
export function useFullPrefetch(href: string, { idle }: { idle: boolean }) {
  const router = useRouter();
  const done = useRef<string | null>(null);

  const prefetch = useCallback(() => {
    if (done.current === href || !navigator.onLine || saveData()) return;
    done.current = href;
    router.prefetch(href, { kind: FULL });
  }, [router, href]);

  useEffect(() => {
    if (!idle) return;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 1500);
    return () => clearTimeout(id);
  }, [idle, prefetch]);

  return prefetch;
}
