/**
 * Ancho del mini-reproductor de YouTube (siempre 16:9). El alto sale del
 * ancho; el máximo según la pantalla lo aplica el CSS con min(...).
 */

/** 356×200: el mínimo que YouTube exige para el reproductor embebido. */
export const VIDEO_MIN_WIDTH = 356;
/** Tamaño rápido "grande". */
export const VIDEO_LARGE_WIDTH = 480;
/** Paso del redimensionado con teclado. */
export const VIDEO_KEY_STEP = 32;

export type VideoCorner = "tl" | "tr" | "bl" | "br";

export function clampVideoWidth(width: number): number {
  return Math.max(VIDEO_MIN_WIDTH, Math.round(width));
}

/** Preferencia guardada: número de px, o los tamaños viejos "sm"/"lg". */
export function parseStoredWidth(raw: string | null): number {
  if (raw === "lg") return VIDEO_LARGE_WIDTH;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? clampVideoWidth(value) : VIDEO_MIN_WIDTH;
}

/**
 * Nuevo ancho al arrastrar el asa, que está en la esquina libre (la opuesta
 * al anclaje): anclada a la derecha crece hacia la izquierda; anclada abajo
 * crece hacia arriba. Se usa el eje con más movimiento (el vertical ×16/9).
 */
export function resizedWidth(
  startWidth: number,
  dx: number,
  dy: number,
  corner: VideoCorner,
): number {
  const byX = corner.endsWith("r") ? -dx : dx;
  const byY = ((corner.startsWith("b") ? -dy : dy) * 16) / 9;
  const delta = Math.abs(byX) >= Math.abs(byY) ? byX : byY;
  return clampVideoWidth(startWidth + delta);
}
