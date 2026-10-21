import { NextResponse } from "next/server";
import type { Catalog, CatalogChord } from "@/lib/chord-catalog";
import { dbError } from "@/lib/db-error";
import {
  catalogInstrument,
  INSTRUMENTS,
  isFretted,
  isInstrument,
} from "@/lib/instruments";
import { PIANO_SUFFIXES } from "@/lib/piano";
import { supabaseServer } from "@/lib/supabase";

/*
 * Catálogo de acordes de un instrumento para consultarlo sin conexión
 * (/catalog/guitar.json…). Se genera en el build y se sirve desde el CDN:
 * el catálogo no cambia entre despliegues. El punto en la ruta la deja fuera
 * del proxy de idioma.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return INSTRUMENTS.map((instrument) => ({ file: `${instrument}.json` }));
}

const PAGE = 1000;

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const instrument = (await params).file.replace(/\.json$/, "");
  if (!isInstrument(instrument)) return new NextResponse(null, { status: 404 });

  const fretted = isFretted(instrument);
  const chords: CatalogChord[] = [];
  // PostgREST limita las filas por respuesta: se pide por páginas.
  for (let from = 0; ; from += PAGE) {
    let query = supabaseServer()
      .from("chords")
      .select(
        fretted
          ? "id,key,suffix,name_en,name_es,category,category_order,note_order,search_text,notes,intervals,positions:chord_positions(position,base_fret,frets,fingers,barres,capo)"
          : "id,key,suffix,name_en,name_es,category,category_order,note_order,search_text,notes,intervals",
      )
      .eq("instrument", catalogInstrument(instrument))
      .order("id")
      .range(from, from + PAGE - 1);
    // Piano: identidad del catálogo de guitarra, solo los tipos de teclado y sin posiciones.
    if (!fretted) query = query.in("suffix", PIANO_SUFFIXES);
    const { data, error, status } = await query.returns<CatalogChord[]>();
    if (error) throw dbError(error, status);
    for (const row of data ?? []) {
      chords.push({
        ...row,
        positions: fretted
          ? [...row.positions].sort((a, b) => a.position - b.position)
          : [],
      });
    }
    if (!data || data.length < PAGE) break;
  }

  const catalog: Catalog = { instrument, chords };
  return NextResponse.json(catalog);
}
