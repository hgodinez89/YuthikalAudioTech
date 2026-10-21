import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChordDataMap } from "@/components/chord-sheet";
import { chordIdFromName, parseChordQuery } from "./chord-search";
import { customChordData, type CustomChordRow } from "./custom-chords";
import { catalogInstrument, chordDbId, isFretted, type Instrument } from "./instruments";
import { pianoChordFromName, pianoInversions } from "./piano";
import { supabaseServer } from "./supabase";

export const CUSTOM_CHORD_COLUMNS = "id,instrument,name,base_fret,frets,barres,keys";

/** Acordes propios del usuario para un instrumento (RLS: solo los suyos). */
export async function loadCustomChords(
  supabase: SupabaseClient,
  instrument: Instrument,
): Promise<CustomChordRow[]> {
  const { data } = await supabase
    .from("custom_chords")
    .select(CUSTOM_CHORD_COLUMNS)
    .eq("instrument", instrument)
    .order("name")
    .returns<CustomChordRow[]>();
  // Sin la biblioteca la canción se sigue viendo con el catálogo.
  return data ?? [];
}

/** "C/E" → acorde "C" con bajo "E" (nota del catálogo); otros nombres, null. */
function splitBass(name: string): { base: string; bass: string } | null {
  const parts = name.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const bass = parseChordQuery(parts[1]);
  if (bass.kind !== "chord" || bass.suffixes !== null) return null;
  return { base: parts[0], bass: bass.keys[0] };
}

/**
 * Diagramas (del instrumento activo) de cada acorde nombrado: canción,
 * escala, concierto. Los acordes propios (`custom`) tienen prioridad sobre el
 * catálogo; un acorde con bajo que no está definido ("C/E") usa el diagrama
 * del acorde base y anota el bajo.
 */
export async function loadChordData(
  instrument: Instrument,
  names: string[],
  custom: CustomChordRow[] = [],
): Promise<ChordDataMap> {
  const customByName = new Map(custom.map((c) => [c.name, c]));
  const map: ChordDataMap = {};
  /* Lo que falta buscar en el catálogo: nombre → acorde a buscar y bajo. */
  const pending = new Map<string, { lookup: string; bass?: string }>();
  for (const name of names) {
    const own = customByName.get(name);
    if (own) {
      map[name] = customChordData(own);
      continue;
    }
    const slash = splitBass(name);
    if (slash) {
      const ownBase = customByName.get(slash.base);
      if (ownBase) map[name] = { ...customChordData(ownBase, name), bass: slash.bass };
      else pending.set(name, { lookup: slash.base, bass: slash.bass });
      continue;
    }
    pending.set(name, { lookup: name });
  }

  const idByName = new Map<string, string>();
  for (const [name, { lookup }] of pending) {
    const slug = chordIdFromName(lookup);
    if (slug) idByName.set(name, chordDbId(instrument, slug));
  }
  if (idByName.size === 0) return map;

  // Catálogo público: sin cookies, así las páginas de escalas pueden ser estáticas.
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("chords")
    .select("id,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)")
    .eq("instrument", catalogInstrument(instrument))
    .in("id", [...new Set(idByName.values())])
    .eq("positions.position", 1);

  const byId = new Map(
    (data ?? []).map((row) => [
      row.id as string,
      {
        nameEs: row.name_es as string,
        position: (
          row.positions as { base_fret: number; frets: number[]; barres: number[] }[]
        )[0],
      },
    ]),
  );

  for (const [name, id] of idByName) {
    const found = byId.get(id);
    if (!found) continue;
    const { lookup, bass } = pending.get(name)!;
    if (isFretted(instrument)) {
      map[name] = {
        name,
        nameEs: found.nameEs,
        frets: found.position.frets,
        barres: found.position.barres,
        baseFret: found.position.base_fret,
        bass,
      };
    } else {
      // Piano: teclas calculadas (posición fundamental) en lugar de trastes.
      const keys = pianoChordFromName(lookup);
      if (keys) {
        map[name] = {
          name,
          nameEs: found.nameEs,
          keys: pianoInversions(keys)[0].notes,
          frets: [],
          barres: [],
          baseFret: 1,
          bass,
        };
      }
    }
  }
  return map;
}
