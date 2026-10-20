/**
 * Filas de la sincronización (calibración) y del karaoke. Ambas salen de
 * `syncPlan`: una fila por vuelta de cada línea, con los mismos índices de
 * marca, así lo que se marca en una pantalla es lo que sigue la otra.
 */
import {
  buildVisualModel,
  parseChordPro,
  strumToArrows,
  syncPlan,
  type SectionType,
  type SheetLine,
} from "./chordpro";

type Granularity = "line" | "word";
type Title = (section: {
  type: SectionType;
  number: number;
  label: string | null;
}) => string | null;
type Pass = { n: number; total: number } | null;

/* ---------- calibración ---------- */

export type CalibrationRow =
  | { kind: "section"; title: string }
  | {
      kind: "line";
      /** Trozos marcables; `spaceAfter` evita partir palabras con acordes ("Re·demp·tion"). */
      words: { text: string; spaceAfter: boolean }[];
      firstTarget: number;
      targetCount: number;
      /** Vuelta de una línea con repetición (x2 → 1/2, 2/2). */
      pass: Pass;
    };

/** Filas de la hoja de calibración + total de objetivos según granularidad. */
export function calibrationRows(
  content: string,
  granularity: Granularity,
  title: Title,
): { rows: CalibrationRow[]; totalTargets: number } {
  const rows: CalibrationRow[] = [];
  const plan = syncPlan(content, granularity);
  let p = 0;
  let lineNo = 0;
  for (const section of buildVisualModel(content)) {
    const heading = title(section);
    if (heading) rows.push({ kind: "section", title: heading });
    for (const line of section.lines) {
      // En líneas instrumentales cada acorde es un objetivo "por palabra".
      const words = line.instrumental
        ? line.instrumental.tokens.flatMap((tk) =>
            tk.kind === "chord" ? [{ text: tk.chord, spaceAfter: true }] : [],
          )
        : line.units
            .filter((u) => u.text)
            .map((u) => ({ text: u.text, spaceAfter: u.spaceAfter }));
      for (; p < plan.length && plan[p].line === lineNo; p++) {
        const step = plan[p];
        rows.push({
          kind: "line",
          words,
          firstTarget: step.firstTarget,
          targetCount: step.targets,
          pass: step.passes > 1 ? { n: step.pass, total: step.passes } : null,
        });
      }
      lineNo++;
    }
  }
  const last = plan.at(-1);
  return { rows, totalTargets: last ? last.firstTarget + last.targets : 0 };
}

/* ---------- karaoke ---------- */

/** Línea de karaoke: segmentos + encabezado de sección si es la primera. */
export type KaraokeLine = {
  section: string | null;
  strum: string | null;
  /** Notas {c: …} que preceden a la línea (no se sincronizan). */
  notes: string[];
  segments: SheetLine;
  /** Vuelta de una línea con repetición (x2 → 1/2, 2/2), o null. */
  pass: Pass;
  /** Objetivos de sincronización de esta vuelta (ver `syncPlan`). */
  firstTarget: number;
  targets: number;
};

type BaseLine = Omit<KaraokeLine, "pass" | "firstTarget" | "targets">;

function baseLines(content: string, title: Title): BaseLine[] {
  const lines: BaseLine[] = [];
  // Las notas se adjuntan a la siguiente línea de letra (aunque sea de otra sección).
  let notes: string[] = [];
  for (const section of parseChordPro(content).sections) {
    let first = true;
    for (const segments of section.lines) {
      if (!segments.length) continue; // separadores en blanco no aplican aquí
      if (segments[0].note) {
        notes.push(segments[0].text);
        continue;
      }
      lines.push({
        section: first ? title(section) : null,
        strum: first && section.strum ? strumToArrows(section.strum) : null,
        notes,
        segments,
      });
      notes = [];
      first = false;
    }
  }
  return lines;
}

/**
 * Líneas a mostrar: una por vuelta. Una línea con `x2` aparece dos veces y
 * dura dos vueltas; el encabezado y las notas solo van en la primera.
 */
export function karaokeLines(
  content: string,
  granularity: Granularity,
  title: Title,
): KaraokeLine[] {
  const bases = baseLines(content, title);
  return syncPlan(content, granularity).flatMap((step) => {
    const base = bases[step.line];
    if (!base) return [];
    const first = step.pass === 1;
    return [
      {
        ...base,
        section: first ? base.section : null,
        strum: first ? base.strum : null,
        notes: first ? base.notes : [],
        pass: step.passes > 1 ? { n: step.pass, total: step.passes } : null,
        firstTarget: step.firstTarget,
        targets: step.targets,
      },
    ];
  });
}
