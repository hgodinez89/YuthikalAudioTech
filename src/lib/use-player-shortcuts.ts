"use client";

import { useEffect, useRef } from "react";

/**
 * Atajos de teclado de un reproductor: `actions` mapea tecla → acción
 * (letras en minúscula, " " para Espacio, nombres como "ArrowLeft" o "Home").
 * Se ignoran mientras se escribe en un campo y con Ctrl/Cmd/Alt. El listener
 * se suscribe una sola vez y siempre usa las acciones vigentes.
 */
export function usePlayerShortcuts(actions: Record<string, (() => void) | undefined>) {
  const current = useRef(actions);
  useEffect(() => {
    current.current = actions;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const action = current.current[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
