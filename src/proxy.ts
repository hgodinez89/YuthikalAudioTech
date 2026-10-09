import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { INSTRUMENT_COOKIE, isInstrument } from "@/lib/instruments";

/** Recuerda el último instrumento visitado: "/" lleva directo a él. */
function rememberInstrument(request: NextRequest, response: NextResponse) {
  const segment = request.nextUrl.pathname.split("/")[1];
  if (
    isInstrument(segment) &&
    request.cookies.get(INSTRUMENT_COOKIE)?.value !== segment
  ) {
    response.cookies.set(INSTRUMENT_COOKIE, segment, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
}

/** Mantiene fresca la sesión de Supabase (rota tokens vía cookies). */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    rememberInstrument(request, response);
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Obligatorio tras crear el cliente: dispara el refresh si el token expiró.
  await supabase.auth.getUser();

  rememberInstrument(request, response);
  return response;
}

export const config = {
  // Solo rutas que pueden necesitar sesión; excluye estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
