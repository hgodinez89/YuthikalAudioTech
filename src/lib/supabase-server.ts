import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./supabase";

type SessionClient = Awaited<ReturnType<typeof supabaseWithSession>>;

/**
 * Id del usuario con sesión, o null. `getClaims` verifica la firma del JWT
 * (localmente con claves asimétricas, sin ir a Supabase Auth en cada render).
 */
export async function sessionUserId(supabase: SessionClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Cliente de servidor CON la sesión del usuario (leída de cookies).
 * Usar en Server Components, server actions y route handlers que tocan
 * datos privados (playlists, canciones…): RLS aplica con auth.uid().
 */
export async function supabaseWithSession() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En Server Components las cookies son de solo lectura; el
          // middleware se encarga de refrescar la sesión.
        }
      },
    },
  });
}
