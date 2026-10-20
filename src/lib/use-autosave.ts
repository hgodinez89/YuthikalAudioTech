"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "saved" | "dirty" | "saving" | "error";

type SaveResult = { ok: true } | { ok: false; error: string };
type Entry<T> = { value: T };

/**
 * Autoguardado con debounce, compartido por el editor y la sincronización.
 * - Lo pendiente se guarda igual al salir de la pantalla.
 * - Con cambios sin guardar, el navegador avisa antes de cerrar o recargar.
 * - Un fallo (de BD o de red) queda en "error", listo para `retry()`.
 * - Los guardados van en fila: uno lento nunca pisa a uno más nuevo.
 * `dirty` arranca el guardado: false mientras el valor sea el que vino del servidor.
 */
export function useAutosave<T>({
  value,
  dirty,
  delay,
  save,
}: {
  value: T;
  dirty: boolean;
  delay: number;
  save: (value: T) => Promise<SaveResult>;
}) {
  /* Último valor que se guardó (o se intenta guardar) y cómo terminó. */
  const [settled, setSettled] = useState<{
    value: T;
    phase: "saving" | "saved" | "error";
    error: string | null;
  }>(() => ({ value, phase: "saved", error: null }));
  /* Último valor sin guardar (o cuyo guardado falló). */
  const pending = useRef<Entry<T> | null>(null);
  const saveRef = useRef(save);
  const valueRef = useRef(value);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    saveRef.current = save;
    valueRef.current = value;
  });

  const run = useCallback((entry: Entry<T>) => {
    queue.current = queue.current.then(async () => {
      if (pending.current !== entry) return; // llegó un valor más nuevo
      setSettled({ value: entry.value, phase: "saving", error: null });
      let result: SaveResult;
      try {
        result = await saveRef.current(entry.value);
      } catch {
        result = { ok: false, error: "network" };
      }
      if (pending.current !== entry) return; // el más nuevo se guarda después
      if (result.ok) pending.current = null;
      setSettled({
        value: entry.value,
        phase: result.ok ? "saved" : "error",
        error: result.ok ? null : result.error,
      });
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const entry = { value };
    pending.current = entry;
    const timer = setTimeout(() => run(entry), delay);
    return () => clearTimeout(timer);
  }, [value, dirty, delay, run]);

  /* Al salir de la pantalla: lo pendiente se guarda sin esperar el debounce. */
  useEffect(
    () => () => {
      const entry = pending.current;
      if (entry) void saveRef.current(entry.value).catch(() => {});
    },
    [],
  );

  const state: SaveState =
    dirty && !Object.is(value, settled.value) ? "dirty" : settled.phase;

  const unsaved = state !== "saved";
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);

  const retry = useCallback(() => {
    const entry = pending.current;
    if (entry) run(entry);
  }, [run]);

  /* Descarta lo pendiente (p. ej. el servidor ya lo invalidó). */
  const discard = useCallback(() => {
    pending.current = null;
    setSettled({ value: valueRef.current, phase: "saved", error: null });
  }, []);

  return { state, error: state === "error" ? settled.error : null, retry, discard };
}
