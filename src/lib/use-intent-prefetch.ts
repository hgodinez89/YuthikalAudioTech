"use client";

import { useState } from "react";

/**
 * Precarga completa de una ruta dinámica (sesión + BD) solo cuando el usuario
 * muestra intención: cursor encima, toque o foco. Antes, la precarga por
 * defecto de Next (hasta su loading.tsx). Se esparce sobre un `<Link>`.
 */
export function useIntentPrefetch(enabled: boolean) {
  const [intent, setIntent] = useState(false);
  if (!enabled) return {};
  const show = () => setIntent(true);
  return {
    prefetch: intent ? true : null,
    onMouseEnter: show,
    onTouchStart: show,
    onFocus: show,
  };
}
