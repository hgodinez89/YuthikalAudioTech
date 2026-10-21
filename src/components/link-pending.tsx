"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/*
 * Respuesta inmediata al pulsar un enlace a una ruta dinámica sin loading.tsx
 * (la canción y sus modos): la pantalla actual sigue visible hasta que llega
 * la nueva. Deben ir DENTRO del <Link> (useLinkStatus lee su estado).
 */

/** El icono del enlace; mientras navega, un aro girando del mismo tamaño. */
export function PendingIcon({ children, size }: { children: ReactNode; size: number }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle
      size={size}
      strokeWidth={2.4}
      aria-hidden
      className="shrink-0 animate-spin motion-reduce:animate-none"
    />
  ) : (
    children
  );
}

/** Borde de acento latiendo sobre una tarjeta-enlace mientras navega. */
export function PendingOutline({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 animate-pulse border-2 border-accent motion-reduce:animate-none ${className}`}
    />
  ) : null;
}
