/**
 * Parser de búsqueda de acordes. Acepta español e inglés, escrito o dictado:
 *   "Am", "C#7", "Bb maj7", "la menor", "Do sostenido séptima",
 *   "si bemol menor 7", "re sus 4", "sol disminuido"…
 *
 * Devuelve un criterio estructurado (raíz + cualidades) cuando reconoce un
 * acorde, o una búsqueda de texto libre como respaldo.
 */

export type ParsedQuery =
  | { kind: "empty" }
  | { kind: "chord"; keys: string[]; suffixes: string[] | null }
  | { kind: "text"; text: string };

/* pitch class de cada nombre de raíz (es/en, minúsculas sin acentos) */
const ROOT_PC: Record<string, number> = {
  do: 0,
  c: 0,
  re: 2,
  d: 2,
  mi: 4,
  e: 4,
  fa: 5,
  f: 5,
  sol: 7,
  g: 7,
  la: 9,
  a: 9,
  si: 11,
  b: 11,
};

/* pitch class → clave tal como la nombra chords-db */
const PC_TO_DB_KEY = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/* Sufijos compactos válidos tal como existen en chords-db (más alias m/"") */
const COMPACT_SUFFIXES = new Set([
  "major",
  "minor",
  "dim",
  "dim7",
  "sus2",
  "sus4",
  "7sus4",
  "alt",
  "aug",
  "6",
  "69",
  "7",
  "7b5",
  "aug7",
  "9",
  "9b5",
  "aug9",
  "7b9",
  "7#9",
  "11",
  "9#11",
  "13",
  "maj7",
  "maj7b5",
  "maj7#5",
  "maj9",
  "maj11",
  "maj13",
  "m6",
  "m69",
  "m7",
  "m7b5",
  "m9",
  "m11",
  "mmaj7",
  "mmaj7b5",
  "mmaj9",
  "mmaj11",
  "add9",
  "madd9",
]);

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeQuery(q: string): string {
  return stripAccents(q).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Escapa comodines de LIKE en texto del usuario. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

function compactToSuffix(rest: string): string | null {
  if (rest === "") return "major";
  if (rest === "m" || rest === "min") return "minor";
  if (rest === "min7") return "m7";
  if (COMPACT_SUFFIXES.has(rest)) return rest;
  return null;
}

/** Combina las cualidades dichas en palabras en un sufijo de chords-db. */
function wordsToSuffix(words: string[]): string | null {
  const text = words.join(" ");
  if (!text) return "major";

  const has = (re: RegExp) => re.test(text);
  const minor = has(/\bmenor\b|\bminor\b/);
  const major = has(/\bmayor\b|\bmajor\b/);
  const seven = has(/\bseptima\b|\bseventh\b|\b7\b/);
  const nine = has(/\bnovena\b|\bninth\b|\b9\b/);
  const eleven = has(/\boncena\b|\beleventh\b|\b11\b/);
  const thirteen = has(/\btrecena\b|\bthirteenth\b|\b13\b/);
  const six = has(/\bsexta\b|\bsixth\b|\b6\b/);
  const dim = has(/\bdisminuid[oa]\b|\bdiminished\b|\bdim\b|\bsemidisminuid[oa]\b/);
  const halfDim = has(/\bsemidisminuid[oa]\b|\bhalf.?diminished\b/);
  const aug = has(/\baumentad[oa]\b|\baugmented\b|\baug\b/);
  const sus = text.match(/\bsus(?:p(?:endid[oa])?)?\.?\s*([24])\b/);
  const add9 = has(/\badd\s*9\b/);

  if (halfDim) return "m7b5";
  if (dim) return seven ? "dim7" : "dim";
  if (aug) return seven ? "aug7" : nine ? "aug9" : "aug";
  if (sus) return seven ? "7sus4" : `sus${sus[1]}`;
  if (add9) return minor ? "madd9" : "add9";
  if (thirteen) return major ? "maj13" : "13";
  if (eleven) return minor ? "m11" : major ? "maj11" : "11";
  if (nine) return minor ? "m9" : major ? "maj9" : "9";
  if (six) return minor ? "m6" : "6";
  if (seven) return minor ? "m7" : major ? "maj7" : "7";
  if (minor && major) return "mmaj7";
  if (minor) return "minor";
  if (major) return "major";
  return null;
}

export function parseChordQuery(raw: string): ParsedQuery {
  const norm = normalizeQuery(raw);
  if (!norm) return { kind: "empty" };

  const tokens = norm.split(" ");
  const m = tokens[0].match(/^(do|re|mi|fa|sol|la|si|[a-g])([#b♯♭]?)(.*)$/);
  if (!m) return { kind: "text", text: norm };

  const [, rootName, attachedAcc, attachedRest] = m;
  let accidental = attachedAcc === "#" || attachedAcc === "♯" ? 1 : attachedAcc ? -1 : 0;
  let restTokens = tokens.slice(1);

  // "do sostenido …" / "si bemol …" como palabra aparte
  if (!accidental && restTokens[0] === "sostenido") {
    accidental = 1;
    restTokens = restTokens.slice(1);
  } else if (!accidental && restTokens[0] === "bemol") {
    accidental = -1;
    restTokens = restTokens.slice(1);
  }

  const pc = (ROOT_PC[rootName] + accidental + 12) % 12;
  const key = PC_TO_DB_KEY[pc];

  // Sufijo pegado a la raíz ("am7" → "m7") o cualidades en palabras
  const rest = (attachedRest + " " + restTokens.join(" ")).trim();
  const compact = compactToSuffix(rest.replace(/\s+/g, ""));
  const suffix =
    compact ?? wordsToSuffix(restTokens.length || attachedRest ? rest.split(" ") : []);

  if (rest && suffix === null) {
    // Hay raíz pero la cualidad no se entiende → búsqueda de texto libre
    return { kind: "text", text: norm };
  }

  return {
    kind: "chord",
    keys: [key],
    suffixes: rest === "" ? null : [suffix as string],
  };
}
