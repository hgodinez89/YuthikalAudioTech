/** Dominio de playlists: claves de género estables (las etiquetas viven en i18n). */

export const GENRES = [
  "rock",
  "pop",
  "ballad",
  "bolero",
  "ranchera",
  "cumbia",
  "salsa",
  "reggae",
  "blues",
  "country",
  "christian",
  "other",
] as const;

export type Genre = (typeof GENRES)[number];

export type PlaylistRow = {
  id: string;
  name: string;
  description: string;
  genre: Genre;
  genre_other: string | null;
  rating_like: number;
  created_at: string;
};

export type PlaylistWithCount = PlaylistRow & { songs_count: number };

export type PlaylistInput = {
  name: string;
  description: string;
  genre: string;
  genreOther: string;
  ratingLike: number;
};

export type ValidationError = "name" | "description" | "genre" | "genreOther" | "rating";

/** Validación compartida cliente/servidor. Devuelve el primer error o null. */
export function validatePlaylist(input: PlaylistInput): ValidationError | null {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 100) return "name";
  if (input.description.trim().length > 300) return "description";
  if (!GENRES.includes(input.genre as Genre)) return "genre";
  if (input.genre === "other") {
    const other = input.genreOther.trim();
    if (other.length < 1 || other.length > 50) return "genreOther";
  }
  const rating = input.ratingLike;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "rating";
  return null;
}
