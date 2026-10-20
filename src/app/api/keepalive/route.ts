import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ping diario (Vercel Cron) que ejecuta un SELECT trivial: leer ya cuenta
 * como actividad de base de datos y evita la pausa por inactividad del
 * free tier de Supabase. Solo responde al cron: Vercel envía
 * `Authorization: Bearer $CRON_SECRET` cuando la variable está configurada.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, reason: "not-configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, reason: "not-configured" }, { status: 503 });
  }

  const supabase = createClient(url, anonKey);
  const { error } = await supabase.from("keepalive").select("id").limit(1);

  if (error) {
    // El detalle queda en los logs del servidor, nunca en la respuesta.
    console.error("keepalive:", error.message);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
