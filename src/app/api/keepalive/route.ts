import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ping diario (Vercel Cron) que ejecuta un SELECT trivial: leer ya cuenta
 * como actividad de base de datos y evita la pausa por inactividad del
 * free tier de Supabase.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, reason: "Supabase no está configurado" },
      { status: 503 },
    );
  }

  const supabase = createClient(url, anonKey);
  const { error } = await supabase.from("keepalive").select("last_seen_at").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
