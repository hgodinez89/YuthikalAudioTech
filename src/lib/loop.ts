/*
 * Repetir A–B en el karaoke: qué líneas forman el bucle y su rango de tiempo.
 * Funciones puras (con tests); el karaoke las usa con las marcas del audio o,
 * sin audio, con los tiempos del autoscroll.
 */

export type LoopLines = { a: number; b: number };
export type LoopRange = { from: number; to: number };

/**
 * Líneas de la sección que contiene `index`: desde la línea que abre su
 * sección (`sectionStarts[i]`) hasta antes de la siguiente.
 */
export function sectionLines(
  sectionStarts: readonly boolean[],
  index: number,
): LoopLines {
  const last = sectionStarts.length - 1;
  const i = Math.min(Math.max(index, 0), Math.max(last, 0));
  let a = i;
  while (a > 0 && !sectionStarts[a]) a--;
  let b = i;
  while (b < last && !sectionStarts[b + 1]) b++;
  return { a, b };
}

/**
 * Rango de tiempo de las líneas [a, b] (en cualquier orden): desde la primera
 * marca dentro del rango hasta el inicio de la primera línea marcada después
 * de b, o `end` si no hay más. Null si ninguna línea del rango tiene marca.
 */
export function loopRange(
  lineStarts: readonly (number | null)[],
  lines: LoopLines,
  end: number,
): LoopRange | null {
  const a = Math.min(lines.a, lines.b);
  const b = Math.max(lines.a, lines.b);
  let from: number | null = null;
  for (let i = a; i <= b; i++) {
    const start = lineStarts[i];
    if (start !== null && start !== undefined && (from === null || start < from))
      from = start;
  }
  if (from === null) return null;
  let to = end;
  for (let i = b + 1; i < lineStarts.length; i++) {
    const start = lineStarts[i];
    if (start !== null && start !== undefined) {
      to = start;
      break;
    }
  }
  return to > from ? { from, to } : null;
}

/** ¿El reloj acaba de llegar al fin del bucle? (cruce, no estar más allá). */
export function crossedLoopEnd(previous: number, now: number, range: LoopRange): boolean {
  return previous < range.to && now >= range.to;
}
