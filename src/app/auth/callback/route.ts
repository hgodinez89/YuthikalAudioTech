import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-path";
import { supabaseWithSession } from "@/lib/supabase-server";

/** Callback del OAuth de Google: canjea el código por la sesión. */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await supabaseWithSession();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
