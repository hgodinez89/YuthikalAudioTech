import type { ReactNode } from "react";

/* Ilustraciones de línea de los instrumentos (Instruments.dc.html). */

const PATHS: Record<string, ReactNode> = {
  guitar: (
    <>
      <path d="M74 14l-8 8" />
      <path d="M78 10a4 4 0 0 1 4 4l-4 4a4 4 0 0 1-4-4z" />
      <path d="M66 22 41 47" />
      <path d="M41 47c-4-4-11-3-16 2s-8 15-2 21 16 3 21-2 6-13 2-16z" />
      <circle cx="35" cy="58" r="7" />
    </>
  ),
  ukulele: (
    <>
      <path d="M70 20l-6 6" />
      <path d="M64 26 46 44" />
      <path d="M46 44c-3-3-9-2-13 2s-6 12-2 16 13 2 17-2 4-11 1-14z" />
      <circle cx="40" cy="54" r="5.5" />
    </>
  ),
  piano: (
    <>
      <rect x="18" y="26" width="60" height="44" rx="4" />
      <path d="M32 26v28M46 26v28M60 26v28" />
      <path d="M27 54v16M41 54v16M53 54v16M67 54v16" />
    </>
  ),
  bass: (
    <>
      <path d="M76 12l-4 4M80 8l-8 8" />
      <path d="M74 16 40 50" />
      <path d="M40 50c-4-4-11-3-15 1s-5 12 0 17 13 4 17 0 3-14-2-18z" />
      <path d="M74 16l2 2M70 20l2 2M66 24l2 2" />
    </>
  ),
};

export function InstrumentIcon({ name, size = 96 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      // a tamaño de icono el trazo del prototipo se vería demasiado fino
      strokeWidth={size < 48 ? 5.5 : 2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
