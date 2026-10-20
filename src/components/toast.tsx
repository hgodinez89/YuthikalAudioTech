"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* Cuánto dura un aviso y cuánto espera una acción con «Deshacer». */
const TOAST_MS = 5000;
export const UNDO_MS = 6000;

type Toast = {
  id: number;
  message: string;
  tone: "info" | "error";
  undo?: () => void;
};

type ToastInput = { message: string; tone?: "info" | "error"; undo?: () => void };

type Deferred = {
  message: string;
  /** Id del elemento que se oculta mientras la acción espera (la canción borrada). */
  hides: string;
  /** La acción real; devuelve el mensaje de error o null. */
  commit: () => Promise<string | null>;
};

type ToastApi = {
  show: (toast: ToastInput) => void;
  /** Acción diferida con «Deshacer»: se ejecuta a los 6 s si no se deshace. */
  defer: (action: Deferred) => void;
  /** Elementos ocultos por una acción diferida pendiente. */
  hidden: ReadonlySet<string>;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast fuera de ToastProvider");
  return api;
}

/**
 * Avisos de la sección de canciones ("Canción borrada · Deshacer"). Vive en
 * el layout para que un aviso siga visible al navegar (borrar desde el
 * editor vuelve a la lista). Si se sale de la sección, lo pendiente se
 * ejecuta en ese momento; si se cierra la pestaña antes, no se ejecuta.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("songs.toast");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<number, Deferred>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">, ms: number, onTimeout?: () => void) => {
      const id = ++nextId.current;
      // Como máximo 3 a la vez: el más viejo se va primero.
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => {
          dismiss(id);
          onTimeout?.();
        }, ms),
      );
      return id;
    },
    [dismiss],
  );

  const show = useCallback(
    ({ message, tone = "info", undo }: ToastInput) => {
      let id = 0;
      const onUndo =
        undo &&
        (() => {
          dismiss(id);
          undo();
        });
      id = push({ message, tone, undo: onUndo }, undo ? UNDO_MS : TOAST_MS);
    },
    [dismiss, push],
  );

  const reveal = useCallback((key: string) => {
    setHidden((set) => {
      const next = new Set(set);
      next.delete(key);
      return next;
    });
  }, []);

  const run = useCallback(
    async (action: Deferred) => {
      const error = await action.commit().catch(() => t("error"));
      // Si se ejecutó, sigue oculta: la lista se actualiza sin ella.
      if (!error) return;
      reveal(action.hides);
      push({ message: error, tone: "error" }, TOAST_MS);
    },
    [push, reveal, t],
  );

  const defer = useCallback(
    (action: Deferred) => {
      setHidden((set) => new Set(set).add(action.hides));
      let id = 0;
      const undo = () => {
        pending.current.delete(id);
        dismiss(id);
        reveal(action.hides);
      };
      id = push({ message: action.message, tone: "info", undo }, UNDO_MS, () => {
        if (!pending.current.delete(id)) return;
        void run(action);
      });
      pending.current.set(id, action);
    },
    [dismiss, push, reveal, run],
  );

  /* Cerrar el aviso de una acción diferida la ejecuta en el momento. */
  const close = useCallback(
    (id: number) => {
      dismiss(id);
      const action = pending.current.get(id);
      if (!action) return;
      pending.current.delete(id);
      void run(action);
    },
    [dismiss, run],
  );

  // Al salir de la sección: lo pendiente se ejecuta ya, los avisos se descartan.
  useEffect(() => {
    const timersMap = timers.current;
    const pendingMap = pending.current;
    return () => {
      for (const timer of timersMap.values()) clearTimeout(timer);
      for (const action of pendingMap.values()) void action.commit().catch(() => null);
      timersMap.clear();
      pendingMap.clear();
    };
  }, []);

  const api = useMemo(() => ({ show, defer, hidden }), [show, defer, hidden]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-[440px] items-center gap-1 rounded-[12px] border bg-surface py-1 pl-4 pr-1 text-[13.5px] font-semibold shadow-pop [animation:yk-fade-up_.2s_ease_both] ${
              toast.tone === "error" ? "border-warn/50 text-warn" : "border-accent/40"
            }`}
          >
            {/* Solo el mensaje se anuncia (no los botones). */}
            <span
              role={toast.tone === "error" ? "alert" : "status"}
              className="min-w-0 flex-1 py-2"
            >
              {toast.message}
            </span>
            {toast.undo && (
              <button
                type="button"
                onClick={toast.undo}
                className="min-h-11 shrink-0 cursor-pointer rounded-[9px] px-3 font-bold text-accent hover:bg-accent/10"
              >
                {t("undo")}
              </button>
            )}
            <button
              type="button"
              onClick={() => close(toast.id)}
              aria-label={t("dismiss")}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[9px] text-tert hover:text-ink"
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
