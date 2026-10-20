import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { INSTRUMENT_COOKIE, isInstrument } from "@/lib/instruments";

const YEAR = 60 * 60 * 24 * 365;

/** Guarda una preferencia (idioma, último instrumento) si cambió. */
function remember(
  request: NextRequest,
  response: NextResponse,
  name: string,
  value: string,
) {
  if (request.cookies.get(name)?.value !== value) {
    response.cookies.set(name, value, { maxAge: YEAR, sameSite: "lax" });
  }
}

/**
 * Mantiene fresca la sesión de Supabase (rota tokens vía cookies). `getClaims`
 * verifica el JWT localmente con claves asimétricas y solo va a Supabase Auth
 * cuando hay que refrescarlo.
 */
async function withSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

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
  await supabase.auth.getClaims();
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [locale, section, page] = pathname.split("/").slice(1);
  const remembered = request.cookies.get(INSTRUMENT_COOKIE)?.value;

  // Sin idioma (enlaces viejos, "/"): al preferido del navegador o al español.
  // El inicio lleva directo al último instrumento visitado.
  if (!isLocale(locale)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const target = isLocale(saved) ? saved : defaultLocale;
    const rest =
      pathname === "/"
        ? isInstrument(remembered)
          ? `/${remembered}/chords`
          : ""
        : pathname;
    return NextResponse.redirect(new URL(`/${target}${rest}${search}`, request.url));
  }
  if (!section && isInstrument(remembered)) {
    return NextResponse.redirect(new URL(`/${locale}/${remembered}/chords`, request.url));
  }

  // La sesión solo se lee en las rutas privadas y el login: el catálogo
  // público no pasa por Supabase Auth.
  const response =
    section === "login" || page === "songs"
      ? await withSession(request)
      : NextResponse.next();

  remember(request, response, LOCALE_COOKIE, locale);
  if (isInstrument(section)) remember(request, response, INSTRUMENT_COOKIE, section);
  return response;
}

export const config = {
  // Páginas: fuera quedan API, callback de OAuth, internos y archivos (con punto).
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
