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
 * El render es SIEMPRE texto React (nunca HTML crudo): el contenido lo
 * escribe el usuario y debe quedar escapado.
 */

export type ChordSegment = { chord: string | null; text: string };
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
  const open = (type: SectionType, label: string | null): SheetSection => {
    counters[type] += 1;
    const section: SheetSection = {
      type,
      number: counters[type],
      label,
      strum: null,
      lines: [],
    };
    song.sections.push(section);
    return section;
  };

  for (const rawLine of content.split(/\r?\n/)) {
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
        if (!current) current = open("plain", null);
        current.strum = value || null;
      } else if (name in SECTION_STARTS) {
        current = open(SECTION_STARTS[name], value || null);
      } else if (SECTION_ENDS.has(name)) current = null;
      // directivas desconocidas (comment, capo…) se ignoran sin fallar
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

    if (!current) current = open("plain", null);
    current.lines.push(parseLine(line));
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
      });
      pending = null;
    }
    // espacios: separan unidades; un acorde pendiente se conserva
  }
  // acorde colgante al final de la línea sin palabra posterior
  if (pending) {
    units.push({
      chord: pending.chord || null,
      text: "",
      textStart: rawLine.length,
      chordStart: pending.start,
      chordEnd: pending.end,
    });
  }
  return units;
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

export type VisualLyricLine = { lineIndex: number; units: LyricUnit[] };

export type VisualSection = {
  /** Índice de línea del encabezado {sov}/{soc}/{sob}; null en secciones implícitas. */
  headerLineIndex: number | null;
  type: SectionType;
  number: number;
  label: string | null;
  strum: string | null;
  lines: VisualLyricLine[];
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
    };
    sections.push(section);
    return section;
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
        current = open(SECTION_STARTS[name], value || null, i);
      } else if (SECTION_ENDS.has(name)) {
        current = null;
      }
      continue;
    }

    if (!line.trim()) continue;
    if (!current) current = open("plain", null, null);
    current.lines.push({ lineIndex: i, units: parseLyricUnits(rawLines[i]) });
  }

  return sections.filter((s) => s.lines.length > 0);
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
