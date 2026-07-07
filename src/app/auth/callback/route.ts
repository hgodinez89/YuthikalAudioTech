import { NextResponse } from "next/server";
import { supabaseWithSession } from "@/lib/supabase-server";

/** Callback del OAuth de Google: canjea el código por la sesión. */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/playlists";
  // Solo rutas relativas internas — nunca redirigir a dominios externos.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/playlists";

  if (code) {
    const supabase = await supabaseWithSession();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
