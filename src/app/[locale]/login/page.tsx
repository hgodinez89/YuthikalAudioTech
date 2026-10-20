import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginCard } from "@/components/login-card";
import { safeNextPath } from "@/lib/safe-path";
import { sessionUserId, supabaseWithSession } from "@/lib/supabase-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("title")} — Yuthikal AudioTech`, robots: { index: false } };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, { next: rawNext }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const next = safeNextPath(rawNext);
  const supabase = await supabaseWithSession();
  // `next` ya trae el idioma (/es/…): se redirige tal cual.
  if (await sessionUserId(supabase)) redirect(next);

  return <LoginCard next={next} />;
}
