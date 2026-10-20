"use client";

import { useCallback, useRef, type HTMLAttributes } from "react";

/**
 * Fila de chips con scroll horizontal: difumina el borde que todavía tiene
 * contenido oculto (`data-more-start` / `data-more-end` → `.yk-fade-x`).
 */
export function FadeRow({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  const cleanup = useRef<(() => void) | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.toggleAttribute("data-more-start", el.scrollLeft > 1);
      el.toggleAttribute("data-more-end", el.scrollLeft < max - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    cleanup.current = () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);
  return <div ref={ref} className={`yk-fade-x ${className}`} {...props} />;
}
