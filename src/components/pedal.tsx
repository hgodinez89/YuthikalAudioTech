"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { readPref, writePref } from "@/lib/use-stored-flag";

/* Pantallas táctiles (iPad, teléfonos). Ahí un pedal Bluetooth que iOS no
   reconoce como teclado completo (el teclado de pantalla no se oculta) solo
   entrega sus teclas a un campo de texto activo, nunca a la página. */
const TOUCH_QUERY = "(any-pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/* Campos donde se escribe: sus teclas no son para el libro (salvo el
   receptor del pedal, marcado con data-page-keys). */
export const TYPING = "input, textarea, select, [contenteditable='true']";

/* El aviso del pedal se deja de mostrar al cerrarlo o al usar el pedal. */
const PEDAL_HINT_KEY = "yk-pedal-hint";

/* off: receptor inactivo · ready: activo, esperando la primera tecla ·
   on: ya llegó una tecla del pedal. */
type PedalState = "off" | "ready" | "on";

type Pedal = {
  state: PedalState;
  hintDone: boolean;
  toggle: () => void;
  finishHint: () => void;
  /** Llegó una tecla de pasar página desde el receptor. */
  markWorked: () => void;
};

const PedalContext = createContext<Pedal | null>(null);

/** Pedal del libro; null sin pantalla táctil o sin proveedor. */
export function usePedal() {
  return useContext(PedalContext);
}

/**
 * Receptor del pedal: un campo invisible que no abre el teclado de pantalla
 * (inputmode="none") y queda activo mientras se lee, para que iOS le entregue
 * las teclas del pedal. Solo en táctiles; en la computadora el teclado ya
 * llega a la página. Va por encima de lo que se vuelve a montar (en el
 * concierto, el libro de cada canción): si el campo desapareciera, iOS lo
 * desconectaría y el pedal dejaría de funcionar al cambiar de canción.
 */
export function PedalProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("book");
  const touchScreen = useSyncExternalStore(
    subscribeTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
  const active = enabled && touchScreen;
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<PedalState>("off");
  // Aviso "¿Usas un pedal?" (solo táctiles, hasta cerrarlo o usar el pedal).
  const [hintDone, setHintDone] = useState(() => readPref(PEDAL_HINT_KEY) === "done");
  const finishHint = useCallback(() => {
    setHintDone(true);
    writePref(PEDAL_HINT_KEY, "done");
  }, []);
  /* iOS solo le conecta el teclado (y el pedal) a un campo activado durante un
     toque: activado por código queda "activo" pero sordo. Por eso se activa
     únicamente desde un toque, y si quedó activo sin uno (iOS puede devolverle
     el foco al volver a la app), el siguiente toque lo reactiva. */
  const byTouch = useRef(false);
  // Apagado con su botón: los toques ya no lo activan hasta volver a pedirlo.
  const off = useRef(false);
  /* El pedal ya respondió: al reactivarse (cada toque en la página lo
     desactiva y lo vuelve a activar) sigue como "on". */
  const worked = useRef(false);

  const focus = useCallback(() => {
    const el = inputRef.current;
    const current = document.activeElement;
    if (!el) return;
    if (current === el && !byTouch.current) el.blur();
    if (document.activeElement === el) return;
    // No se le quita el foco a otro campo donde se esté escribiendo.
    if (current !== el && current instanceof Element && current.closest(TYPING)) return;
    el.focus({ preventScroll: true });
    byTouch.current = true;
    setState(worked.current ? "on" : "ready");
  }, []);

  const toggle = () => {
    off.current = state !== "off";
    if (off.current) inputRef.current?.blur();
    else focus();
  };

  const markWorked = useCallback(() => {
    worked.current = true;
    setState("on");
    finishHint();
  }, [finishHint]);

  /* Cualquier toque en la pantalla (la página, el título, la cabecera, la
     barra) activa el receptor; los botones también (el diagrama de un acorde
     se cierra por toque, no por foco). Se excluyen los enlaces, los botones
     que abren un menú (el foco pasa a sus opciones; al elegir una, ese toque
     lo reactiva) y el botón y el aviso del pedal (deciden ellos). */
  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element) || off.current) return;
      if (target.closest("a, [aria-haspopup], [data-pedal-skip]")) return;
      focus();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [active, focus]);

  return (
    <PedalContext.Provider
      value={active ? { state, hintDone, toggle, finishHint, markWorked } : null}
    >
      {children}
      {active && (
        <input
          ref={inputRef}
          data-page-keys
          aria-label={t("pedal")}
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          tabIndex={-1}
          // Lo que "escriba" el pedal no se queda.
          onInput={(e) => {
            e.currentTarget.value = "";
          }}
          onBlur={() => {
            byTouch.current = false;
            setState("off");
          }}
          // 16 px: con menos, iOS hace zoom al activarlo. Casi invisible pero
          // con tamaño real: iOS puede negarse a activar un campo de 1 px.
          className="pointer-events-none fixed bottom-0 left-0 h-5 w-10 border-0 bg-transparent p-0 text-[16px] text-transparent caret-transparent opacity-[0.02] outline-none"
        />
      )}
    </PedalContext.Provider>
  );
}

/* Pie pisando un pedal, con el trazo de los íconos de Lucide. */
function PedalIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 22h20" />
      <path d="M2.5 14.5 13 19.75" />
      <path d="M9 17.75 7.5 22" />
      <path d="M4 13 14 18 15 15V10L12 9Q9 11 6 11Q4 11.3 4 13Z" />
      <path d="M12 9 15 2" />
      <path d="M15 10 19 2" />
    </svg>
  );
}

/**
 * Botón del pedal para la barra del libro: «Activar pedal» → «Pisa el
 * pedal…» (con pulso) hasta la primera tecla → ícono con ✓. Tocarlo activo lo
 * apaga. Encima, el aviso «¿Usas un pedal?» mientras está apagado.
 */
export function PedalButton() {
  const t = useTranslations("book");
  const pedal = usePedal();
  if (!pedal) return null;
  const { state, hintDone, toggle, finishHint } = pedal;
  return (
    <>
      {/* Sin mousedown: tras un toque, el clic simulado le quitaría el foco al
          receptor antes de que el botón decida. */}
      <div data-pedal-skip onMouseDown={(e) => e.preventDefault()} className="relative">
        {!hintDone && state === "off" && (
          <div
            role="status"
            className="absolute -left-3.5 bottom-[54px] z-10 flex w-[300px] flex-col gap-2.5 rounded-[14px] border border-accent/45 bg-surface px-4 py-3.5 shadow-pop"
          >
            <div className="flex items-center gap-2 text-accent">
              <PedalIcon size={18} />
              <span className="text-sm font-bold text-ink">{t("pedalHintTitle")}</span>
            </div>
            <p className="text-[13px] leading-[1.45] text-sub">{t("pedalHintBody")}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={finishHint}
                className="h-8 cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-3 text-xs font-semibold text-sub hover:text-ink"
              >
                {t("pedalHintOk")}
              </button>
            </div>
            <span
              aria-hidden
              className="absolute -bottom-[7px] left-12 size-3 rotate-45 border-r border-b border-accent/45 bg-surface"
            />
          </div>
        )}
        {state === "on" ? (
          <button
            type="button"
            onClick={toggle}
            aria-label={t("pedalOn")}
            title={t("pedalOn")}
            className="yk-gradient-soft relative grid size-10 cursor-pointer place-items-center rounded-[11px] border border-accent/45 text-accent"
          >
            <PedalIcon size={18} />
            <span className="yk-gradient absolute -top-[5px] -right-[5px] grid size-4 place-items-center rounded-full border-2 border-page">
              <Check size={9} strokeWidth={4} />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            className={
              state === "ready"
                ? "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-accent bg-surface-2 px-3 text-[13px] font-semibold whitespace-nowrap text-accent animate-[yk-pedal-pulse_1.8s_ease-out_infinite]"
                : "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[11px] border border-edge-2 bg-surface-2 px-3 text-[13px] font-semibold whitespace-nowrap text-sub hover:text-ink"
            }
          >
            <PedalIcon size={16} />
            {state === "ready" ? t("pedalReady") : t("pedalActivate")}
          </button>
        )}
      </div>
      <span className="mx-1 h-6 w-px bg-edge" />
    </>
  );
}
