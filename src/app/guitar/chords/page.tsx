import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChordFinder } from "@/components/chord-finder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("finder");
  return { title: `${t("title")} — Yuthikal AudioTech` };
}

export default function ChordFinderPage() {
  return <ChordFinder />;
}
