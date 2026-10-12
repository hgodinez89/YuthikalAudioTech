/**
 * Importador de cifrado "acordes encima de la letra" (el formato de casi
 * todos los sitios de acordes) a ChordPro:
 *
 *   Capo 3                      →   {c: Capo 3}
 *   Coro:                            [[Coro]]
 *   Am      F      C                 [Am]Bésame, [F]bésame [C]mucho
 *   Bésame, bésame mucho
 *
 * Una línea es "de acordes" solo si TODOS sus tokens son símbolos de acorde
 * con mayúscula inicial (C#m7, Bb/D, Lam, Sol7…), así una letra como
 * "la la la" o "A mi manera" nunca se confunde con acordes. Lo que ya es
 * ChordPro (directivas, [acordes] en línea) pasa sin cambios.
 */

const ROOT = "(?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])(?:#|b|♯|♭)?";
const QUALITY =
  "(?:maj|min|m|M|dim|aug|sus|add|°|º|ø|\\+)?\\d*(?:(?:maj|sus|add|b|#|♭|♯|\\+|-)\\d+)*(?:\\([^)\\s]*\\))?";
const CHORD_RE = new RegExp(`^${ROOT}${QUALITY}(?:/${ROOT})?$`);

/* Tokens de relleno habituales en líneas de acordes: barras, repeticiones. */
const FILLER_RE = /^(?:\|+|-+|\/|\(?x\d+\)?|\*+)$/i;

const SECTION_RE =
  /^[[(]?\s*(intro|introducci[oó]n|verso|verse|estrofa|pre-?coro|pre-?chorus|coro|chorus|estribillo|refr[aá]n|puente|bridge|interludio|interlude|solo|instrumental|outro|final)(\s*\d+)?\s*[\])]?\s*:?$/i;

/* Indicaciones para el músico que suelen encabezar un cifrado. */
const NOTE_RE = /^(capo|cejilla|afinaci[oó]n|tuning)\b/i;

/** Expande tabuladores a espacios (tope cada 8 columnas) para alinear columnas. */
function expandTabs(line: string): string {
  let out = "";
  for (const ch of line) {
    out += ch === "\t" ? " ".repeat(8 - (out.length % 8)) : ch;
  }
  return out;
}

export function isChordSymbol(token: string): boolean {
  return CHORD_RE.test(token);
}

/** Acordes de la línea con su columna, o null si no es una línea de acordes. */
export function chordsInLine(line: string): { col: number; chord: string }[] | null {
  const tokens = [...line.matchAll(/\S+/g)];
  if (tokens.length === 0) return null;
  const chords: { col: number; chord: string }[] = [];
  for (const m of tokens) {
    if (isChordSymbol(m[0])) chords.push({ col: m.index, chord: m[0] });
    else if (!FILLER_RE.test(m[0])) return null;
  }
  return chords.length ? chords : null;
}

/** Inserta [acorde] en las columnas de la letra (de derecha a izquierda). */
function mergeChords(lyric: string, chords: { col: number; chord: string }[]): string {
  let out = lyric;
  for (const { col, chord } of [...chords].reverse()) {
    if (out.length < col) out = out.padEnd(col, " ");
    out = `${out.slice(0, col)}[${chord}]${out.slice(col)}`;
  }
  return out.trimEnd();
}

const isDirective = (line: string) => /^\s*\{.*\}\s*$/.test(line);

export function chordsOverLyricsToChordPro(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => expandTabs(l).trimEnd());
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Encabezado, solo ("Coro:") o con acordes en la misma línea ("Intro: C G").
    const inline = trimmed.match(/^(.+?:)\s+(.+)$/);
    const inlineChords = inline && SECTION_RE.test(inline[1]) && chordsInLine(inline[2]);
    const headerText = inlineChords ? inline[1] : trimmed;
    const header = headerText.match(SECTION_RE);
    if (header) {
      const label = headerText.replace(/^[[(]\s*|\s*[\])]?\s*:?$/g, "").trim();
      out.push(`[[${label}]]`);
      if (inlineChords) out.push(inlineChords.map((c) => `[${c.chord}]`).join(" "));
      continue;
    }

    if (NOTE_RE.test(trimmed)) {
      out.push(`{c: ${trimmed}}`);
      continue;
    }

    const chords = isDirective(line) ? null : chordsInLine(line);
    if (!chords) {
      out.push(line);
      continue;
    }

    // Acordes + letra debajo → una sola línea con los acordes anclados.
    const next = lines[i + 1];
    const nextIsLyric =
      next !== undefined &&
      next.trim() !== "" &&
      !isDirective(next) &&
      !SECTION_RE.test(next.trim()) &&
      !chordsInLine(next);

    if (nextIsLyric) {
      out.push(mergeChords(next, chords));
      i++;
    } else {
      // Línea instrumental (intro, solo…): solo acordes.
      out.push(chords.map((c) => `[${c.chord}]`).join(" "));
    }
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
