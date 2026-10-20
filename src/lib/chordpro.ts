/**
 * Parser de ChordPro. Convierte el texto de la canción en una estructura
 * renderizable: secciones (verso/coro/puente) con su patrón de rasgueo
 * ({strum:} — directiva propia) y líneas de segmentos acorde+texto.
 *
 *   {title: St. James Infirmary}
 *   {key: Em}
 *   {start_of_verse}
 *   {strum: D - D U - U D U}
 *   I went [Em]down to the St. [Am]James In[Em]firmary
 *   {end_of_verse}
 *
 * Atajos propios de la app:
 *   [[Intro]]          encabezado de sección con cualquier texto
 *   {c: Capo III}      nota para el músico (estándar ChordPro {comment:})
 *
 * El render es SIEMPRE texto React (nunca HTML crudo): el contenido lo
 * escribe el usuario y debe quedar escapado.
 */

export type ChordSegment = {
  chord: string | null;
  text: string;
  /** Nota para el músico ({c: …}): se muestra aparte, no es letra. */
  note?: true;
  /** Separador de compás `|` de una línea instrumental. */
  bar?: true;
  /** Repetición (`x2`) al final de una línea instrumental. */
  repeat?: number;
};
export type SheetLine = ChordSegment[];
export type SectionType = "verse" | "chorus" | "bridge" | "plain";

export type SheetSection = {
  type: SectionType;
  /** Correlativo por tipo (Verso 1, Verso 2…). */
  number: number;
  /** Etiqueta explícita de la directiva, si la hubo. */
  label: string | null;
  strum: string | null;
  lines: SheetLine[];
  /** Línea del texto donde empieza (encabezado o primera línea): ancla del scroll del editor. */
  startLine: number;
};

export type ParsedSong = {
  title: string | null;
  artist: string | null;
  key: string | null;
  sections: SheetSection[];
};

const SECTION_STARTS: Record<string, SectionType> = {
  start_of_verse: "verse",
  sov: "verse",
  start_of_chorus: "chorus",
  soc: "chorus",
  start_of_bridge: "bridge",
  sob: "bridge",
};

/* Notas para el músico (ChordPro estándar). */
const NOTE_DIRECTIVES = new Set(["c", "comment", "ci", "comment_italic"]);

/** Texto de un encabezado `[[…]]` que ocupa toda la línea, o null. */
export function sectionHeaderLabel(line: string): string | null {
  const m = line.trim().match(/^\[\[([^[\]]+)\]\]$/);
  const label = m?.[1].trim();
  return label ? label : null;
}

const SECTION_ENDS = new Set([
  "end_of_verse",
  "eov",
  "end_of_chorus",
  "eoc",
  "end_of_bridge",
  "eob",
]);

function parseLine(raw: string): SheetLine {
  const segments: SheetLine = [];
  const regex = /\[([^\]]*)\]/g;
  let lastIndex = 0;
  let pendingChord: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const text = raw.slice(lastIndex, match.index);
    if (text || pendingChord !== null) {
      segments.push({ chord: pendingChord, text });
    }
    pendingChord = match[1].trim() || null;
    lastIndex = regex.lastIndex;
  }
  const tail = raw.slice(lastIndex);
  if (tail || pendingChord !== null) {
    segments.push({ chord: pendingChord, text: tail });
  }
  return segments;
}

/* ------------------------------------------------------------------ */
/* Líneas instrumentales: solo acordes, con compases y repeticiones    */
/*   Em D Bm C x2      | Em | D | (2x)      [Em] [D] ×3                 */
/* ------------------------------------------------------------------ */

const ROOT = "(?:Do|Re|Mi|Fa|Sol|La|Si|[A-G])(?:#|b|♯|♭)?";
const QUALITY =
  "(?:maj|min|m|M|dim|aug|sus|add|°|º|ø|\\+)?\\d*(?:(?:maj|sus|add|b|#|♭|♯|\\+|-)\\d+)*(?:\\([^)\\s]*\\))?";
const CHORD_RE = new RegExp(`^${ROOT}${QUALITY}(?:/${ROOT})?$`);
const REPEAT_RE = /^\(?(?:[x×](\d+)|(\d+)[x×])\)?$/i;
const BAR_RE = /^\|{1,2}$/;

/** Símbolo de acorde con mayúscula inicial (C#m7, Bb/D, Lam, Sol7…). */
export function isChordSymbol(token: string): boolean {
  return CHORD_RE.test(token);
}

export type InstrumentalToken =
  | { kind: "chord"; chord: string; start: number; end: number; bracketed: boolean }
  | { kind: "bar"; start: number; end: number }
  | { kind: "repeat"; times: number; start: number; end: number };

export type InstrumentalLine = { tokens: InstrumentalToken[]; repeat: number };

/**
 * Línea solo de acordes. Para no confundir letra con acordes ("La La La")
 * solo se reconoce si tiene al menos un `|` o una repetición final
 * (x2, ×2, 2x, (x2)…); si no, sigue siendo letra.
 */
export function parseInstrumentalLine(raw: string): InstrumentalLine | null {
  const matches = [...raw.matchAll(/\S+/g)];
  if (matches.length === 0) return null;
  const tokens: InstrumentalToken[] = [];
  let repeat = 1;
  let marked = false;

  for (const [n, m] of matches.entries()) {
    const text = m[0];
    const start = m.index;
    const end = start + text.length;
    const repeatMatch = text.match(REPEAT_RE);
    const bracket = text.match(/^\[([^\]]+)\]$/);

    if (repeatMatch && n === matches.length - 1) {
      repeat = Number(repeatMatch[1] ?? repeatMatch[2]);
      tokens.push({ kind: "repeat", times: repeat, start, end });
      marked = true;
    } else if (BAR_RE.test(text)) {
      tokens.push({ kind: "bar", start, end });
      marked = true;
    } else if (bracket) {
      tokens.push({
        kind: "chord",
        chord: bracket[1].trim(),
        start,
        end,
        bracketed: true,
      });
    } else if (isChordSymbol(text)) {
      tokens.push({ kind: "chord", chord: text, start, end, bracketed: false });
    } else {
      return null;
    }
  }

  const hasChord = tokens.some((tk) => tk.kind === "chord");
  return hasChord && marked && repeat >= 1 ? { tokens, repeat } : null;
}

/** Línea instrumental ya parseada (segmentos de acordes, compases, repetición). */
export function isInstrumental(line: SheetLine): boolean {
  return line.length > 0 && line.every((s) => s.bar || s.repeat || (s.chord && !s.text));
}

/**
 * Agrupa los segmentos de una línea de letra en palabras indivisibles para el
 * salto de renglón: `any[A7m]more, ` es un solo grupo con dos trozos, así una
 * palabra con un acorde en medio baja completa en vez de partirse. Cada trozo
 * conserva el acorde del inicio de su segmento; el espacio va al final del grupo.
 */
export function wordGroups(line: SheetLine): { chord: string | null; text: string }[][] {
  const groups: { chord: string | null; text: string }[][] = [];
  let current: { chord: string | null; text: string }[] = [];
  for (const segment of line) {
    const parts = segment.text.match(/\S+\s*|\s+/g) ?? [""];
    parts.forEach((text, i) => {
      current.push({ chord: i === 0 ? segment.chord : null, text });
      if (/\s$/.test(text)) {
        groups.push(current);
        current = [];
      }
    });
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Vueltas de una línea (1 si no tiene repetición). */
export function lineRepeat(line: SheetLine): number {
  return line.find((s) => s.repeat)?.repeat ?? 1;
}

function instrumentalSegments(line: InstrumentalLine): SheetLine {
  return line.tokens.map((tk) =>
    tk.kind === "chord"
      ? { chord: tk.chord, text: "" }
      : tk.kind === "bar"
        ? { chord: null, text: "|", bar: true }
        : { chord: null, text: `×${tk.times}`, repeat: tk.times },
  );
}

export function parseChordPro(content: string): ParsedSong {
  const song: ParsedSong = { title: null, artist: null, key: null, sections: [] };
  const counters: Record<SectionType, number> = {
    verse: 0,
    chorus: 0,
    bridge: 0,
    plain: 0,
  };
  let current: SheetSection | null = null;

  // `open` es pura y `current` se asigna siempre en el flujo principal:
  // el análisis de flujo de TS no ve asignaciones hechas dentro de closures.
  const open = (
    type: SectionType,
    label: string | null,
    startLine: number,
  ): SheetSection => {
    counters[type] += 1;
    const section: SheetSection = {
      type,
      number: counters[type],
      label,
      strum: null,
      lines: [],
      startLine,
    };
    song.sections.push(section);
    return section;
  };

  for (const [i, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.trimEnd();
    const directive = line.trim().match(/^\{([^:}]+)(?::([\s\S]*))?\}$/);

    if (directive) {
      const name = directive[1].trim().toLowerCase();
      const value = directive[2]?.trim() ?? "";

      if (name === "title" || name === "t") song.title = value || null;
      else if (name === "artist" || name === "subtitle" || name === "st") {
        song.artist = value || null;
      } else if (name === "key") song.key = value || null;
      else if (name === "strum") {
        if (!current) current = open("plain", null, i);
        current.strum = value || null;
      } else if (name in SECTION_STARTS) {
        current = open(SECTION_STARTS[name], value || null, i);
      } else if (SECTION_ENDS.has(name)) current = null;
      else if (NOTE_DIRECTIVES.has(name) && value) {
        if (!current) current = open("plain", null, i);
        current.lines.push([{ chord: null, text: value, note: true }]);
      }
      // directivas desconocidas (capo…) se ignoran sin fallar
      continue;
    }

    const header = sectionHeaderLabel(line);
    if (header) {
      current = open("plain", header, i);
      continue;
    }

    if (!line.trim()) {
      // línea en blanco: separación dentro de la sección (sin duplicados)
      if (
        current &&
        current.lines.length &&
        current.lines[current.lines.length - 1].length
      ) {
        current.lines.push([]);
      }
      continue;
    }

    if (!current) current = open("plain", null, i);
    const instrumental = parseInstrumentalLine(line);
    current.lines.push(
      instrumental ? instrumentalSegments(instrumental) : parseLine(line),
    );
  }

  // limpiar: quitar líneas en blanco finales y secciones vacías
  for (const section of song.sections) {
    while (section.lines.length && !section.lines[section.lines.length - 1].length) {
      section.lines.pop();
    }
  }
  song.sections = song.sections.filter((s) => s.lines.length > 0);
  return song;
}

/** "D - D U" → "↓ – ↓ ↑" para mostrar el rasgueo como flechas. */
export function strumToArrows(strum: string): string {
  const MAP: Record<string, string> = { d: "↓", u: "↑", "-": "–" };
  return strum
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => MAP[token.toLowerCase()] ?? token)
    .join(" ");
}

/** "↓ – ↓ ↑" → "D - D U" para serializar el rasgueo del editor visual. */
export function arrowsToStrum(arrows: string): string {
  const MAP: Record<string, string> = { "↓": "D", "↑": "U", "–": "-" };
  return arrows
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => MAP[token] ?? token)
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* Edición visual: unidades palabra/acorde con offsets sobre el texto  */
/* crudo, para insertar o reemplazar [acordes] sin perder contenido.   */
/* ------------------------------------------------------------------ */

export type LyricUnit = {
  chord: string | null;
  text: string;
  /** Offset del inicio del texto en la línea cruda. */
  textStart: number;
  /** Rango del token [acorde] que lo precede, si existe. */
  chordStart: number | null;
  chordEnd: number | null;
  /** En el texto original sigue un espacio antes de la próxima unidad. */
  spaceAfter: boolean;
};

/** Divide una línea de letra en unidades clicables (palabra + acorde). */
export function parseLyricUnits(rawLine: string): LyricUnit[] {
  const units: LyricUnit[] = [];
  // token: [acorde] opcional + secuencia sin espacios, o espacios sueltos
  const regex = /(\[[^\]]*\])|([^\s[]+)|(\s+)/g;
  let pending: { chord: string; start: number; end: number } | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rawLine)) !== null) {
    if (match[1] !== undefined) {
      // Dos acordes seguidos ("[C] [G]"): el anterior queda como unidad sin texto.
      if (pending) {
        units.push({
          chord: pending.chord || null,
          text: "",
          textStart: match.index,
          chordStart: pending.start,
          chordEnd: pending.end,
          spaceAfter: rawLine.slice(pending.end, match.index).length > 0,
        });
      }
      pending = {
        chord: match[1].slice(1, -1).trim(),
        start: match.index,
        end: match.index + match[1].length,
      };
      continue;
    }
    if (match[2] !== undefined) {
      units.push({
        chord: pending?.chord || null,
        text: match[2],
        textStart: match.index,
        chordStart: pending?.start ?? null,
        chordEnd: pending?.end ?? null,
        spaceAfter: false,
      });
      pending = null;
      continue;
    }
    // espacios: separan unidades; un acorde pendiente se conserva. Si el
    // acorde va pegado a la palabra ("word[C] next"), el espacio igual cuenta.
    const last = units[units.length - 1];
    if (
      last &&
      last.text &&
      last.textStart + last.text.length === (pending ? pending.start : match.index)
    ) {
      last.spaceAfter = true;
    }
  }
  // acorde colgante al final de la línea sin palabra posterior
  if (pending) {
    units.push({
      chord: pending.chord || null,
      text: "",
      textStart: rawLine.length,
      chordStart: pending.start,
      chordEnd: pending.end,
      spaceAfter: false,
    });
  }
  return units;
}

/**
 * Unidades agrupadas por palabra (hasta la que tiene espacio después), para
 * que el editor visual no parta en dos renglones una palabra con acorde en medio.
 */
export function unitGroups(units: LyricUnit[]): LyricUnit[][] {
  const groups: LyricUnit[][] = [];
  let current: LyricUnit[] = [];
  for (const unit of units) {
    current.push(unit);
    if (unit.spaceAfter) {
      groups.push(current);
      current = [];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Asigna, reemplaza o quita (chord = null) el acorde de una unidad. */
export function setChordAtUnit(
  content: string,
  lineIndex: number,
  unit: LyricUnit,
  chord: string | null,
): string {
  const lines = content.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return content;

  if (unit.chordStart !== null && unit.chordEnd !== null) {
    const replacement = chord ? `[${chord}]` : "";
    lines[lineIndex] =
      line.slice(0, unit.chordStart) + replacement + line.slice(unit.chordEnd);
  } else if (chord) {
    lines[lineIndex] =
      line.slice(0, unit.textStart) + `[${chord}]` + line.slice(unit.textStart);
  }
  return lines.join("\n");
}

/**
 * Define el rasgueo de una sección: reemplaza la directiva {strum} que sigue
 * al encabezado, la inserta si no existe, o la elimina (strum = null).
 */
export function setSectionStrum(
  content: string,
  sectionHeaderLineIndex: number,
  strum: string | null,
): string {
  const lines = content.split("\n");
  if (lines[sectionHeaderLineIndex] === undefined) return content;

  const next = lines[sectionHeaderLineIndex + 1] ?? "";
  const hasStrum = /^\{strum(?::[\s\S]*)?\}$/.test(next.trim());

  if (hasStrum) {
    if (strum) lines[sectionHeaderLineIndex + 1] = `{strum: ${strum}}`;
    else lines.splice(sectionHeaderLineIndex + 1, 1);
  } else if (strum) {
    lines.splice(sectionHeaderLineIndex + 1, 0, `{strum: ${strum}}`);
  }
  return lines.join("\n");
}

/* Modelo del editor visual: secciones con índices de línea reales. */

export type VisualLyricLine = {
  lineIndex: number;
  units: LyricUnit[];
  /** Hubo línea(s) en blanco antes, dentro de la sección (separación de estrofa). */
  gapBefore: boolean;
  /** Notas {c: …} que van justo antes de esta línea. */
  notesBefore: string[];
  /** Línea solo de acordes (con compases/repetición), o null si es letra. */
  instrumental: InstrumentalLine | null;
};

export type VisualSection = {
  /** Índice de línea del encabezado {sov}/{soc}/{sob}; null en secciones implícitas. */
  headerLineIndex: number | null;
  type: SectionType;
  number: number;
  label: string | null;
  strum: string | null;
  /** Solo letra: es lo que se marca al sincronizar (las notas no cuentan). */
  lines: VisualLyricLine[];
  /** Notas {c: …} al final de la sección, sin letra después. */
  trailingNotes: string[];
};

export function buildVisualModel(content: string): VisualSection[] {
  const sections: VisualSection[] = [];
  const counters: Record<SectionType, number> = {
    verse: 0,
    chorus: 0,
    bridge: 0,
    plain: 0,
  };
  let current: VisualSection | null = null;

  const open = (
    type: SectionType,
    label: string | null,
    headerLineIndex: number | null,
  ): VisualSection => {
    counters[type] += 1;
    const section: VisualSection = {
      headerLineIndex,
      type,
      number: counters[type],
      label,
      strum: null,
      lines: [],
      trailingNotes: [],
    };
    sections.push(section);
    return section;
  };

  // Notas y separaciones pendientes hasta la próxima línea de letra.
  let pendingNotes: string[] = [];
  let pendingGap = false;
  const flush = () => {
    if (current && pendingNotes.length) current.trailingNotes.push(...pendingNotes);
    pendingNotes = [];
    pendingGap = false;
  };

  const rawLines = content.split("\n");
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trimEnd();
    const directive = line.trim().match(/^\{([^:}]+)(?::([\s\S]*))?\}$/);

    if (directive) {
      const name = directive[1].trim().toLowerCase();
      const value = directive[2]?.trim() ?? "";
      if (name === "strum") {
        if (!current) current = open("plain", null, null);
        current.strum = value || null;
      } else if (name in SECTION_STARTS) {
        flush();
        current = open(SECTION_STARTS[name], value || null, i);
      } else if (SECTION_ENDS.has(name)) {
        flush();
        current = null;
      } else if (NOTE_DIRECTIVES.has(name) && value) {
        if (!current) current = open("plain", null, null);
        pendingNotes.push(value);
      }
      continue;
    }

    const header = sectionHeaderLabel(line);
    if (header) {
      flush();
      current = open("plain", header, i);
      continue;
    }

    if (!line.trim()) {
      pendingGap = true;
      continue;
    }
    if (!current) current = open("plain", null, null);
    current.lines.push({
      lineIndex: i,
      units: parseLyricUnits(rawLines[i]),
      gapBefore: pendingGap && current.lines.length > 0,
      notesBefore: pendingNotes,
      instrumental: parseInstrumentalLine(line),
    });
    pendingNotes = [];
    pendingGap = false;
  }
  flush();

  return sections.filter((s) => s.lines.length > 0 || s.trailingNotes.length > 0);
}

/**
 * Cambia (o quita, con chord = null) un acorde de una línea instrumental
 * escrito como texto ("Em D Bm C x2"). Al quitarlo también se va el espacio
 * que lo sigue, para no dejar huecos dobles.
 */
export function replaceInstrumentalToken(
  content: string,
  lineIndex: number,
  token: { start: number; end: number },
  chord: string | null,
): string {
  const lines = content.split("\n");
  const line = lines[lineIndex];
  if (line === undefined) return content;
  if (chord) {
    lines[lineIndex] = line.slice(0, token.start) + chord + line.slice(token.end);
  } else {
    const end = line.slice(token.end).match(/^\s*/)![0].length + token.end;
    lines[lineIndex] = line.slice(0, token.start) + line.slice(end);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Plan de sincronización: lo comparten calibración y karaoke para que  */
/* el índice de cada marca signifique lo mismo en ambos.               */
/* ------------------------------------------------------------------ */

export type SyncPass = {
  /** Índice de la línea de letra (orden de aparición, sin notas ni encabezados). */
  line: number;
  /** Vuelta actual (1…passes) y total de vueltas de la línea (x2 → 2). */
  pass: number;
  passes: number;
  /** Objetivos a marcar en esta vuelta y el índice global del primero. */
  targets: number;
  firstTarget: number;
};

export function syncPlan(content: string, granularity: "line" | "word"): SyncPass[] {
  const plan: SyncPass[] = [];
  let line = 0;
  let target = 0;
  for (const section of buildVisualModel(content)) {
    for (const lyric of section.lines) {
      const passes = lyric.instrumental?.repeat ?? 1;
      const words = lyric.instrumental
        ? lyric.instrumental.tokens.filter((tk) => tk.kind === "chord").length
        : lyric.units.filter((u) => u.text).length;
      const targets = granularity === "line" ? 1 : Math.max(words, 1);
      for (let pass = 1; pass <= passes; pass++) {
        plan.push({ line, pass, passes, targets, firstTarget: target });
        target += targets;
      }
      line++;
    }
  }
  return plan;
}

/**
 * Título visible de una sección: su etiqueta propia, o el nombre del tipo con
 * su número ("Verso 2"; el coro solo se numera desde el segundo). Las
 * secciones implícitas ("plain") no tienen título.
 */
export function sectionTitle(
  section: { type: SectionType; number: number; label: string | null },
  name: (type: Exclude<SectionType, "plain">) => string,
): string | null {
  if (section.label) return section.label;
  if (section.type === "plain") return null;
  const base = name(section.type);
  if (section.type === "verse") return `${base} ${section.number}`;
  return section.number > 1 ? `${base} ${section.number}` : base;
}

/**
 * Huella de la sincronización: el texto de cada objetivo en el mismo orden
 * que `syncPlan` (línea completa o palabra, más su vuelta). Si la letra cambia,
 * comparar huellas dice qué marcas siguen valiendo.
 */
export function syncTargets(content: string, granularity: "line" | "word"): string[] {
  const keys: string[] = [];
  for (const section of buildVisualModel(content)) {
    for (const lyric of section.lines) {
      const passes = lyric.instrumental?.repeat ?? 1;
      const words = lyric.instrumental
        ? lyric.instrumental.tokens.flatMap((tk) =>
            tk.kind === "chord" ? [tk.chord] : [],
          )
        : lyric.units.filter((u) => u.text).map((u) => u.text);
      const lineText = lyric.instrumental
        ? words.join(" ")
        : lyric.units
            .map((u) => (u.spaceAfter ? `${u.text} ` : u.text))
            .join("")
            .trim();
      for (let pass = 1; pass <= passes; pass++) {
        if (granularity === "line" || words.length === 0)
          keys.push(`${lineText}#${pass}`);
        else for (const word of words) keys.push(`${word}#${pass}`);
      }
    }
  }
  return keys;
}

/** Acordes únicos de la canción, en orden de aparición. */
export function collectChords(song: ParsedSong): string[] {
  const seen = new Set<string>();
  const chords: string[] = [];
  for (const section of song.sections) {
    for (const line of section.lines) {
      for (const segment of line) {
        if (segment.chord && !seen.has(segment.chord)) {
          seen.add(segment.chord);
          chords.push(segment.chord);
        }
      }
    }
  }
  return chords;
}
