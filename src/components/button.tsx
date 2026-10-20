import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Botones y chips del design system: un solo radio y relleno por tamaño.
   Las clases también sirven para enlaces (`<Link className={buttonClass(…)}>`). */

export type ButtonVariant =
  "primary" | "secondary" | "danger" | "dangerSoft" | "accentSoft";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "yk-gradient font-bold",
  secondary: "border border-edge-2 bg-surface-2 font-semibold hover:border-accent/50",
  danger: "bg-warn font-bold text-page",
  dangerSoft: "border border-warn/30 bg-warn/10 font-bold text-warn hover:bg-warn/15",
  accentSoft:
    "border border-accent/40 bg-accent/10 font-semibold text-accent hover:bg-accent/15",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "gap-2 px-[15px] py-[9px] text-[13px]",
  md: "gap-2 px-5 py-[11px] text-sm",
  lg: "gap-2 px-6 py-3 text-[15px]",
};

export function buttonClass(
  variant: ButtonVariant = "secondary",
  size: ButtonSize = "md",
) {
  return `inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={`${buttonClass(variant, size)} ${className}`}
      {...props}
    />
  );
}

/**
 * Chip de filtro: píldora (`pill`) o tecla de nota (`key`). Activo, con el
 * degradado (`gradient`) o con el acento (`accent`).
 */
export function chipClass({
  active,
  tone = "gradient",
  shape = "pill",
}: {
  active: boolean;
  tone?: "gradient" | "accent";
  shape?: "pill" | "key";
}) {
  const base =
    shape === "key"
      ? "min-w-[46px] justify-center rounded-[10px] px-2.5 py-2 text-[13.5px]"
      : "rounded-full px-3.5 py-[7px] text-[13px]";
  const state = !active
    ? "border border-edge bg-surface-2 font-semibold text-sub hover:border-edge-2 hover:text-ink"
    : tone === "gradient"
      ? "yk-gradient border border-transparent font-bold"
      : "border border-accent bg-accent/15 font-bold text-accent";
  return `yk-hit-y relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 ${base} ${state}`;
}

/** Insignia pequeña en mayúsculas ("Próximamente", "Actual"…). */
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-edge-2 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.06em] text-tert">
      {children}
    </span>
  );
}
