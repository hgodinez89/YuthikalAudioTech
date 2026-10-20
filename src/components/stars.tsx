"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

/* Estrella del prototipo: rellena en cian, vacía con trazo gris. */
export function Star({ filled, size = 15 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "var(--accent)" : "none"}
      stroke={filled ? "var(--accent)" : "var(--disabled)"}
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.5 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

export function StarsRow({ value, size }: { value: number; size?: number }) {
  const t = useTranslations("playlists");
  return (
    <span role="img" aria-label={t("stars", { count: value })} className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= value} size={size} />
      ))}
    </span>
  );
}

export function StarsInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const t = useTranslations("playlists");
  const labelId = useId();
  return (
    <div>
      <span id={labelId} className="mb-[9px] block text-[12.5px] font-semibold text-sub">
        {label}
      </span>
      {/* Radios: flechas para cambiar la calificación (patrón radiogroup). */}
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === value}
            tabIndex={i === value ? 0 : -1}
            onClick={() => onChange(i)}
            onKeyDown={(e) => {
              const step =
                e.key === "ArrowRight" || e.key === "ArrowUp"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowDown"
                    ? -1
                    : 0;
              if (!step) return;
              e.preventDefault();
              const nextValue = Math.min(5, Math.max(1, value + step));
              onChange(nextValue);
              const group = e.currentTarget.parentElement;
              (group?.children[nextValue - 1] as HTMLElement | undefined)?.focus();
            }}
            aria-label={t("stars", { count: i })}
            className="yk-hit relative cursor-pointer rounded-md leading-none [--hit:9px]"
          >
            <Star filled={i <= value} size={26} />
          </button>
        ))}
      </div>
    </div>
  );
}
