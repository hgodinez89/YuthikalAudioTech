import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChordCardData } from "@/components/chord-card";
import { escapeLike, parseChordQuery } from "./chord-search";
import type { ChordCategory } from "./chords";
import { catalogInstrument, isFretted, type Instrument } from "./instruments";
import { PIANO_SUFFIXES, pianoRootKeys } from "./piano";

export const PAGE_SIZE = 36;

export type ChordRow = ChordCardData & {
  key: string;
  suffix: string;
  category: ChordCategory;
};

export type ChordPage = { rows: ChordRow[]; total: number };

export type ChordGrouping = "cat" | "note";

/**
 * Una página del buscador de acordes. Sirve en servidor (primera página,
 * `supabaseServer()`) y en cliente (búsqueda y scroll, `supabaseBrowser()`).
 */
export async function fetchChords(
  client: SupabaseClient,
  instrument: Instrument,
  rawQuery: string,
  grouping: ChordGrouping,
  offset: number,
): Promise<ChordPage> {
  const parsed = parseChordQuery(rawQuery);
  let qb = client
    .from("chords")
    .select(
      "id,key,suffix,name_en,name_es,category,positions:chord_positions!inner(base_fret,frets,barres,position)",
      { count: "exact" },
    )
    .eq("instrument", catalogInstrument(instrument))
    .eq("positions.position", 1);
  // Piano: identidad del catálogo de guitarra, solo tipos que se tocan en teclado.
  if (!isFretted(instrument)) qb = qb.in("suffix", PIANO_SUFFIXES);

  if (parsed.kind === "chord") {
    qb = qb.in("key", parsed.keys);
    if (parsed.suffixes) qb = qb.in("suffix", parsed.suffixes);
  } else if (parsed.kind === "text") {
    qb = qb.ilike("search_text", `%${escapeLike(parsed.text)}%`);
  }

  qb =
    grouping === "cat"
      ? qb.order("category_order").order("note_order").order("name_en")
      : qb.order("note_order").order("category_order").order("name_en");

  const { data, count, error } = await qb.range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const rows: ChordRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    key: r.key as string,
    suffix: r.suffix as string,
    name_en: r.name_en as string,
    name_es: r.name_es as string,
    category: r.category as ChordCategory,
    position: (r.positions as ChordRow["position"][])[0],
    keys: isFretted(instrument)
      ? undefined
      : pianoRootKeys(r.key as string, r.suffix as string),
  }));
  return { rows, total: count ?? 0 };
}
