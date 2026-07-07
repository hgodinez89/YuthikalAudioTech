import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Faltan las variables de entorno de Supabase");
  return { url, anonKey };
}

let browserClient: SupabaseClient | undefined;

/** Cliente para componentes de cliente. Guarda la sesión en cookies para
 *  que el servidor también pueda leerla (@supabase/ssr). */
export function supabaseBrowser(): SupabaseClient {
  const { url, anonKey } = supabaseEnv();
  browserClient ??= createBrowserClient(url, anonKey);
  return browserClient;
}

/** Cliente de servidor SIN sesión — solo para el catálogo público. */
export function supabaseServer(): SupabaseClient {
  const { url, anonKey } = supabaseEnv();
  return createClient(url, anonKey);
}
