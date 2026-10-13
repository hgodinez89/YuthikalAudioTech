"use client";

import { GripHorizontal, Maximize2, Minimize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type RefObject,
} from "react";

type Corner = "tl" | "tr" | "bl" | "br";
type Size = "sm" | "lg";

const CORNER_KEY = "yk-video-corner";
const SIZE_KEY = "yk-video-size";

/* Ubicación por esquina: arriba bajo el header, abajo sobre el transporte. */
const CORNER_CLASS: Record<Corner, string> = {
  tl: "left-4 top-[88px]",
  tr: "right-4 top-[88px]",
  bl: "left-4 bottom-[156px] sm:bottom-[120px]",
  br: "right-4 bottom-[156px] sm:bottom-[120px]",
};

/* Chico = 356×200 (mínimo que YouTube exige para el reproductor embebido). */
const SIZE_CLASS: Record<Size, string> = {
  sm: "sm:w-[356px]",
  lg: "sm:w-[480px]",
};

function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value as T) ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: dura solo esta visita */
  }
}

const noopSubscribe = () => () => {};

/**
 * Mini-reproductor flotante: el nodo donde se monta el iframe de YouTube
 * (`containerRef`) nunca cambia de lugar en el DOM —mover un iframe lo
 * recarga—; solo se reposiciona con CSS. Se arrastra y se acomoda en la
 * esquina más cercana; esquina y tamaño se recuerdan en el dispositivo.
 *
 * "Cerrar" no desmonta el iframe (eso destruiría el reproductor y cortaría
 * el audio): la tarjeta sale de la pantalla con su tamaño real.
 */
export function FloatingVideo({
  containerRef,
  open,
  onClose,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("calibration");
  // Preferencias del navegador solo tras hidratar (el servidor no las conoce).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [corner, setCorner] = useState<Corner>(() =>
    typeof window === "undefined"
      ? "br"
      : readPref(CORNER_KEY, ["tl", "tr", "bl", "br"], "br"),
  );
  const [size, setSize] = useState<Size>(() =>
    typeof window === "undefined" ? "sm" : readPref(SIZE_KEY, ["sm", "lg"], "sm"),
  );
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const placement = mounted ? corner : "br";
  const width = mounted ? size : "sm";

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  };
  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      // Esquina más cercana según el centro de la tarjeta al soltar.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const next = `${cy < window.innerHeight / 2 ? "t" : "b"}${
        cx < window.innerWidth / 2 ? "l" : "r"
      }` as Corner;
      setCorner(next);
      writePref(CORNER_KEY, next);
    }
    setDrag(null);
  };

  const toggleSize = () => {
    const next = width === "sm" ? "lg" : "sm";
    setSize(next);
    writePref(SIZE_KEY, next);
  };

  return (
    <div
      ref={cardRef}
      aria-hidden={!open}
      className={`fixed z-40 w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-edge-2 bg-surface shadow-[0_18px_44px_rgba(0,0,0,0.55)] ${
        open
          ? CORNER_CLASS[placement]
          : "pointer-events-none -left-[9999px] top-0 opacity-0"
      } ${SIZE_CLASS[width]} ${drag ? "" : "transition-[top,bottom,left,right] duration-200"}`}
      style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title={t("videoMove")}
        className={`flex h-8 touch-none select-none items-center justify-between border-b border-edge px-2.5 ${
          drag ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tert">
          <GripHorizontal size={15} strokeWidth={2} />
          {t("video")}
        </span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSize}
            aria-label={width === "sm" ? t("videoLarger") : t("videoSmaller")}
            title={width === "sm" ? t("videoLarger") : t("videoSmaller")}
            className="hidden size-6 cursor-pointer place-items-center rounded-md text-sub hover:bg-edge hover:text-ink sm:grid"
          >
            {width === "sm" ? (
              <Maximize2 size={13} strokeWidth={2.2} />
            ) : (
              <Minimize2 size={13} strokeWidth={2.2} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("videoClose")}
            title={t("videoClose")}
            className="grid size-6 cursor-pointer place-items-center rounded-md text-sub hover:bg-edge hover:text-ink"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </span>
      </div>
      {/* Aquí monta el iframe el motor de audio; mientras se arrastra no
          debe robar los eventos del puntero. */}
      <div
        ref={containerRef}
        className={`aspect-video w-full bg-black ${drag ? "pointer-events-none" : ""}`}
      />
    </div>
  );
}
