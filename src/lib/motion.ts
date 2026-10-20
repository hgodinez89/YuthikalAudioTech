/** Scroll suave salvo que el usuario prefiera movimiento reducido. */
export function smoothBehavior(): ScrollBehavior {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}
