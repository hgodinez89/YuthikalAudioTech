/**
 * Errores de consulta en el servidor. En producción el cliente no recibe el
 * mensaje, solo el `digest`: uno con este prefijo indica que la base de datos
 * no respondió (pausada, sin red), y la página de error lo explica así; el
 * resto muestra un error genérico.
 */
export const DB_DOWN_DIGEST = "db-unavailable";

type QueryError = { message: string; code?: string };

/** Postgres no respondió: sin código de PostgREST/SQL, o caída de conexión o gateway. */
export function isDbUnavailable(error: QueryError, status?: number) {
  return (
    !error.code ||
    /^PGRST00[0-3]$/.test(error.code) ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (status !== undefined && status >= 520)
  );
}

/** Error para lanzar desde un componente de servidor cuando falla una consulta. */
export function dbError(error: QueryError, status?: number): Error {
  const err = new Error(`Consulta fallida: ${error.message}`) as Error & {
    digest?: string;
  };
  // Digest propio (Next lo respeta): único para encontrarlo en los logs.
  if (isDbUnavailable(error, status)) {
    err.digest = `${DB_DOWN_DIGEST}-${Date.now().toString(36)}`;
  }
  return err;
}

/** ¿Este error (ya en el cliente) es de base de datos inaccesible? */
export function isDbDownDigest(digest: string | undefined) {
  return digest?.startsWith(DB_DOWN_DIGEST) ?? false;
}
