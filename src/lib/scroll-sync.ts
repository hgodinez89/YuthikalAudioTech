/**
 * Scroll sincronizado entre dos paneles de distinta altura (editor ChordPro y
 * vista previa). Cada sección es un ancla: su posición en un panel equivale a
 * su posición en el otro; entre anclas se interpola linealmente.
 */

export type ScrollPoint = { from: number; to: number };

/**
 * Scroll del panel destino para `value` en el origen. `points` son las anclas
 * en orden (px desde el inicio de cada panel); `fromMax`/`toMax` son los
 * scroll máximos. Inicio y final siempre se corresponden; se descartan las
 * anclas que no avanzan en ambos paneles o que quedan fuera del recorrido.
 */
export function mapScroll(
  points: ScrollPoint[],
  fromMax: number,
  toMax: number,
  value: number,
): number {
  if (fromMax <= 0 || toMax <= 0) return 0;
  const anchors: ScrollPoint[] = [{ from: 0, to: 0 }];
  for (const p of points) {
    const prev = anchors[anchors.length - 1];
    if (p.from > prev.from && p.from < fromMax && p.to > prev.to && p.to < toMax) {
      anchors.push(p);
    }
  }
  anchors.push({ from: fromMax, to: toMax });

  const v = Math.min(fromMax, Math.max(0, value));
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    if (v <= b.from) return a.to + ((v - a.from) / (b.from - a.from)) * (b.to - a.to);
  }
  return toMax;
}

/** Las mismas anclas vistas desde el otro panel. */
export function invertPoints(points: ScrollPoint[]): ScrollPoint[] {
  return points.map((p) => ({ from: p.to, to: p.from }));
}
