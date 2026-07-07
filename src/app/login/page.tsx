import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginCard } from "@/components/login-card";
import { supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: `${t("title")} — Yuthikal AudioTech` };
}

export default async function LoginPage() {
  const supabase = await supabaseWithSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/playlists");

  return <LoginCard />;
}
