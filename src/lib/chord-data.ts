import type { ChordDataMap } from "@/components/chord-sheet";
import { chordIdFromName } from "./chord-search";
import { catalogInstrument, chordDbId, isFretted, type Instrument } from "./instruments";
import { pianoChordFromName, pianoInversions } from "./piano";
import { supabaseWithSession } from "./supabase-server";

/** Diagramas (del instrumento activo) de cada acorde nombrado: canción, escala. */
export async function loadChordData(
  instrument: Instrument,
  names: string[],
): Promise<ChordDataMap> {
  const idByName = new Map<string, string>();
  for (const name of names) {
    const slug = chordIdFromName(name);
    if (slug) idByName.set(name, chordDbId(instrument, slug));
  }
  if (idByName.size === 0) return {};

  const supabase = await supabaseWithSession();
  const { data } = await supabase
    .from("chords")
    .select("id,name_es,positions:chord_positions!inner(base_fret,frets,barres,position)")
    .eq("instrument", catalogInstrument(instrument))
    .in("id", [...idByName.values()])
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

  const map: ChordDataMap = {};
  for (const [name, id] of idByName) {
    const found = byId.get(id);
    if (!found) continue;
    if (isFretted(instrument)) {
      map[name] = {
        name,
        nameEs: found.nameEs,
        frets: found.position.frets,
        barres: found.position.barres,
        baseFret: found.position.base_fret,
      };
    } else {
      // Piano: teclas calculadas (posición fundamental) en lugar de trastes.
      const keys = pianoChordFromName(name);
      if (keys) {
        map[name] = {
          name,
          nameEs: found.nameEs,
          keys: pianoInversions(keys)[0].notes,
          frets: [],
          barres: [],
          baseFret: 1,
        };
      }
    }
  }
  return map;
}
