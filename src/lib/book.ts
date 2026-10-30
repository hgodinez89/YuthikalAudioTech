/**
 * Cálculos del modo libro (Ver canción): la letra fluye en columnas CSS de
 * altura fija y cada columna es una "página" dibujada sobre una tarjeta.
 *
 *   |<-- tarjeta C -->|V|<-- tarjeta C -->|
 *   | P | columna | P | | P | columna | P |
 *
 * C = ancho de tarjeta, P = margen interior, V = separación entre tarjetas.
 * La separación entre columnas es 2P + V, así cada columna cae dentro de su
 * tarjeta y el paso de una página a la siguiente es S = C + V.
 */

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

/** Margen interior de cada página y separación visual entre páginas (px). */
export const PAGE_PADDING = 28;
export const PAGE_SPACING = 16;
/** Ancho mínimo de una página al 100 %; con más zoom caben menos páginas. */
export const MIN_PAGE_WIDTH = 420;

export type BookLayout = {
  /** Páginas visibles a la vez. */
  visible: number;
  /** Ancho de cada tarjeta y paso horizontal entre páginas. */
  cardWidth: number;
  stride: number;
  /** Separación entre columnas CSS. */
  columnGap: number;
};

export function clampZoom(zoom: number): number {
  const rounded = Math.round(zoom * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, rounded));
}

export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

/** Cuántas páginas caben a lo ancho y con qué medidas. */
export function bookLayout(width: number, zoom: number): BookLayout {
  const min = MIN_PAGE_WIDTH * zoom;
  const visible = Math.max(1, Math.floor((width + PAGE_SPACING) / (min + PAGE_SPACING)));
  const cardWidth = (width - PAGE_SPACING * (visible - 1)) / visible;
  return {
    visible,
    cardWidth,
    stride: cardWidth + PAGE_SPACING,
    columnGap: 2 * PAGE_PADDING + PAGE_SPACING,
  };
}

/** Página (0…) en la que cae un elemento según su posición horizontal. */
export function pageAt(offsetLeft: number, stride: number): number {
  return Math.max(0, Math.floor((offsetLeft - PAGE_PADDING + 1) / stride));
}

/**
 * Primera página visible válida: nunca negativa y sin dejar huecos al final
 * (la última vista siempre muestra páginas llenas).
 */
export function clampStart(start: number, count: number, visible: number): number {
  return Math.min(Math.max(0, start), Math.max(0, count - visible));
}

/** Avanzar o retroceder "una vuelta de hoja": todas las páginas visibles. */
export function turnPage(
  start: number,
  count: number,
  visible: number,
  direction: 1 | -1,
): number {
  return clampStart(start + direction * visible, count, visible);
}

/* Teclas de pasar página: teclados y pedales Bluetooth. Cada pedal (y cada
   modo del pedal) envía algo distinto, e iPadOS a veces nombra las flechas
   a su manera (UIKeyInputRightArrow…); si `key` no llega, se mira `code` y
   el código numérico. */
const NEXT_KEYS = new Set([
  "ArrowRight",
  "Right",
  "UIKeyInputRightArrow",
  "ArrowDown",
  "Down",
  "UIKeyInputDownArrow",
  "PageDown",
  "Enter",
]);
const PREV_KEYS = new Set([
  "ArrowLeft",
  "Left",
  "UIKeyInputLeftArrow",
  "ArrowUp",
  "Up",
  "UIKeyInputUpArrow",
  "PageUp",
]);
const NEXT_CODES = new Set([
  "ArrowRight",
  "ArrowDown",
  "PageDown",
  "Enter",
  "NumpadEnter",
]);
const PREV_CODES = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);
/* 39 →, 40 ↓, 34 Av Pág, 13 Enter · 37 ←, 38 ↑, 33 Re Pág · 32 Espacio */
const NEXT_KEY_CODES = new Set([39, 40, 34, 13]);
const PREV_KEY_CODES = new Set([37, 38, 33]);

export type PageKey = {
  key?: string;
  code?: string;
  keyCode?: number;
  shiftKey?: boolean;
};

/**
 * Hacia dónde pasa la página una tecla (1 siguiente, -1 anterior, null
 * ninguna). Con `onControl` (foco en un botón o enlace) Enter y Espacio son
 * del control: activarlo y además pasar de página daría doble salto.
 */
export function pageTurnDirection(e: PageKey, onControl = false): 1 | -1 | null {
  const key = e.key && e.key !== "Unidentified" ? e.key : null;
  const space =
    key === " " ||
    key === "Spacebar" ||
    (!key && (e.code === "Space" || e.keyCode === 32));
  const enter =
    key === "Enter" ||
    (!key && (e.code === "Enter" || e.code === "NumpadEnter" || e.keyCode === 13));
  if ((space || enter) && onControl) return null;
  if (space) return e.shiftKey ? -1 : 1;
  if (key) return NEXT_KEYS.has(key) ? 1 : PREV_KEYS.has(key) ? -1 : null;
  if (e.code && NEXT_CODES.has(e.code)) return 1;
  if (e.code && PREV_CODES.has(e.code)) return -1;
  if (e.keyCode !== undefined && NEXT_KEY_CODES.has(e.keyCode)) return 1;
  if (e.keyCode !== undefined && PREV_KEY_CODES.has(e.keyCode)) return -1;
  return null;
}
