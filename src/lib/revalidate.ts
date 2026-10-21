import { revalidatePath } from "next/cache";

/**
 * Revalida la lista de canciones (todas las variantes de idioma e
 * instrumento). Con route group, el patrón debe incluirlo: `(list)` aísla
 * su loading.tsx para que no cubra la canción.
 */
export const revalidateSongList = () =>
  revalidatePath("/[locale]/[instrument]/songs/(list)", "page");
