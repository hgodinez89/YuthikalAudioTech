"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ¿Se llegó al final de la página? Observa un elemento centinela al pie del
 * contenido (IntersectionObserver, sin leer el layout en cada scroll); el
 * botón flotante lo usa para alternar entre "ir abajo" e "ir arriba".
 */
export function useAtBottom<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAtBottom(entry.isIntersecting),
      { rootMargin: "0px 0px 100px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, atBottom] as const;
}
