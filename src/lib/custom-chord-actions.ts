"use server";

import { revalidatePath } from "next/cache";
import { CUSTOM_CHORD_COLUMNS } from "./chord-data";
import {
  normalizeChordName,
  validateCustomChord,
  type CustomChordInput,
  type CustomChordRow,
} from "./custom-chords";
import { isFretted } from "./instruments";
import { isUuid } from "./ids";
import { sessionUserId, supabaseWithSession } from "./supabase-server";

type ChordResult = { ok: true; chord: CustomChordRow } | { ok: false; error: string };

/* Las canciones y "Mis acordes" se vuelven a pedir con el acorde nuevo.
   Apuntarla solo a las canciones no ahorra nada: en Next 16, si una acción
   revalida otra ruta, el navegador igual refresca la página actual (en un
   viaje aparte). Y sin revalidar, «Atrás» mostraría canciones con el
   diagrama viejo. */
const revalidateSongs = () => revalidatePath("/[locale]/[instrument]/songs", "layout");

/**
 * Crea (sin `id`) o edita un acorde propio. Se re-valida aquí con las mismas
 * reglas que el constructor; la base las repite en sus checks y RLS limita
 * todo al usuario.
 */
export async function saveCustomChord(
  input: CustomChordInput,
  id?: string,
): Promise<ChordResult> {
  const invalid = validateCustomChord(input);
  if (invalid) return { ok: false, error: invalid };
  if (id !== undefined && !isUuid(id)) return { ok: false, error: "id" };

  const supabase = await supabaseWithSession();
  const userId = await sessionUserId(supabase);
  if (!userId) return { ok: false, error: "auth" };

  const fretted = isFretted(input.instrument);
  const row = {
    instrument: input.instrument,
    name: normalizeChordName(input.name),
    base_fret: fretted ? input.baseFret : 1,
    frets: fretted ? input.frets : [],
    barres: fretted ? [...input.barres].sort((a, b) => a - b) : [],
    keys: fretted ? [] : [...input.keys].sort((a, b) => a - b),
  };
  const query = id
    ? supabase
        .from("custom_chords")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id)
    : supabase.from("custom_chords").insert({ ...row, user_id: userId });
  const { data, error } = await query
    .select(CUSTOM_CHORD_COLUMNS)
    .returns<CustomChordRow[]>();
  // 23505: ya hay un acorde tuyo con ese nombre en este instrumento.
  if (error) return { ok: false, error: error.code === "23505" ? "duplicate" : "db" };
  if (!data?.length) return { ok: false, error: "missing" };

  revalidateSongs();
  return { ok: true, chord: data[0] };
}

export async function deleteCustomChord(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isUuid(id)) return { ok: false, error: "id" };
  const supabase = await supabaseWithSession();
  const { data, error } = await supabase
    .from("custom_chords")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: "db" };
  if (!data?.length) return { ok: false, error: "missing" };
  revalidateSongs();
  return { ok: true };
}
