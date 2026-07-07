import { DB_KEYS, ROOT_SHORT_ES } from "./chords";

export type SongRow = {
  id: string;
  playlist_id: string;
  name: string;
  description: string;
  key_note: string;
  content: string;
  created_at: string;
};

export type SongInput = {
  playlistId: string;
  name: string;
  description: string;
  keyNote: string;
};

/** Tonalidades disponibles: 12 raíces × mayor/menor ("C", "Cm", …). */
export const KEY_OPTIONS: string[] = DB_KEYS.flatMap((k) => [k, `${k}m`]);

/** Etiqueta de tonalidad como en el handoff: "Mi menor — Em", "Sol — G". */
export function keyLabel(keyNote: string): string {
  const minor = keyNote.endsWith("m");
  const root = minor ? keyNote.slice(0, -1) : keyNote;
  const rootEs = ROOT_SHORT_ES[root];
  if (!rootEs) return keyNote;
  return `${rootEs}${minor ? " menor" : ""} — ${keyNote}`;
}

export type SongValidationError = "name" | "description" | "keyNote" | "playlist";

export function validateSong(input: SongInput): SongValidationError | null {
  if (!/^[0-9a-f-]{36}$/i.test(input.playlistId)) return "playlist";
  const name = input.name.trim();
  if (name.length < 1 || name.length > 150) return "name";
  if (input.description.trim().length > 300) return "description";
  if (input.keyNote && !KEY_OPTIONS.includes(input.keyNote)) return "keyNote";
  return null;
}

export const MAX_CONTENT_LENGTH = 20000;
