"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const CYCLE = ["light", "dark", "system"] as const;

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("header");
  // true solo tras hidratar; evita desajuste SSR/cliente al leer el tema.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const current = CYCLE.includes(theme as (typeof CYCLE)[number])
    ? (theme as (typeof CYCLE)[number])
    : "system";
  const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];

  return (
    <button
      type="button"
      aria-label={t("toggleTheme")}
      title={mounted ? `${current} → ${next}` : undefined}
      onClick={() => setTheme(next)}
      className="grid size-[38px] cursor-pointer place-items-center rounded-[10px] border border-edge bg-surface-3 text-sub"
    >
      {!mounted || current === "system" ? (
        <Monitor size={18} strokeWidth={2} />
      ) : current === "dark" ? (
        <Moon size={18} strokeWidth={2} />
      ) : (
        <Sun size={18} strokeWidth={2} />
      )}
    </button>
  );
}
