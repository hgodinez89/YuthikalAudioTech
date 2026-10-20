"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { sectionTitle, type SectionType } from "./chordpro";

export type SectionTitle = (section: {
  type: SectionType;
  number: number;
  label: string | null;
}) => string | null;

/** Título traducido de una sección ("Verso 2", "Coro"…), o null si no tiene. */
export function useSectionTitle(): SectionTitle {
  const t = useTranslations("songView");
  return useCallback((section) => sectionTitle(section, (type) => t(type)), [t]);
}
