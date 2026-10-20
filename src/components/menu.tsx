"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "@/i18n/navigation";

/**
 * Cierra un panel flotante con Escape o al tocar fuera de `root` (el
 * contenedor del botón y el panel). Escape devuelve el foco al botón.
 */
export function useDismiss(
  open: boolean,
  onClose: () => void,
  root: RefObject<HTMLElement | null>,
  trigger: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) onCloseRef.current();
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, root, trigger]);
}

type TriggerProps = {
  className: string;
  "aria-label"?: string;
  title?: string;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Panel flotante no modal (ajustes, atajos…): un botón que lo abre y cierra,
 * Escape y clic fuera. Para listas de acciones, usar `Menu`.
 */
export function Popover({
  trigger,
  panelClassName,
  rootClassName = "relative",
  children,
}: {
  trigger: TriggerProps;
  panelClassName: string;
  rootClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = () => setOpen(false);
  useDismiss(open, close, rootRef, triggerRef);

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        {...trigger}
      />
      {open && (
        <div id={panelId} className={panelClassName}>
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

/* ---------- menú de acciones (role="menu") ---------- */

const MenuContext = createContext<() => void>(() => {});

const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

/**
 * Menú de acciones: Enter/Espacio/↓ en el botón lo abren con el foco en la
 * primera opción; ↑/↓, Inicio y Fin recorren las opciones; Escape o Tab lo
 * cierran. Elegir una opción cierra el menú.
 */
export function Menu({
  trigger,
  label,
  panelClassName,
  rootClassName = "relative",
  children,
}: {
  trigger: TriggerProps;
  /** Nombre del menú para lectores de pantalla. */
  label: string;
  panelClassName: string;
  rootClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /* Al abrir con teclado o clic, el foco pasa a la primera (o última) opción. */
  const focusOnOpen = useRef<"first" | "last">("first");
  const panelId = useId();
  const close = () => setOpen(false);
  useDismiss(open, close, rootRef, triggerRef);

  useEffect(() => {
    if (!open) return;
    const items = panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR);
    if (!items?.length) return;
    (focusOnOpen.current === "last" ? items[items.length - 1] : items[0]).focus();
  }, [open]);

  const items = () =>
    Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);

  const onPanelKeyDown = (e: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") move(index + 1);
    else if (e.key === "ArrowUp") move(index - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(list.length - 1);
    else if (e.key === "Tab") close();
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className={rootClassName}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          focusOnOpen.current = "first";
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        {...trigger}
      />
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label={label}
          onKeyDown={onPanelKeyDown}
          className={panelClassName}
        >
          <MenuContext.Provider
            value={() => {
              close();
              triggerRef.current?.focus();
            }}
          >
            {children}
          </MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

const ITEM_BASE = "flex w-full cursor-pointer items-center text-left outline-none";
/* Tamaño por defecto; un `className` propio lo reemplaza (no se mezclan). */
const ITEM_LAYOUT = "gap-2.5 rounded-[9px] px-3 py-2.5 text-[13.5px]";

/** Opción de un `Menu`: enlace (`href`) o acción (`onSelect`). */
export function MenuItem({
  href,
  onSelect,
  icon,
  tone = "default",
  checked,
  disabled = false,
  className = "",
  children,
}: {
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  /** Opción de selección única (p. ej. la velocidad actual). */
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const close = useContext(MenuContext);
  const toneClass =
    tone === "danger"
      ? "text-warn hover:bg-warn/10 focus-visible:bg-warn/10"
      : "hover:bg-edge focus-visible:bg-edge";
  const cls = `${ITEM_BASE} ${className || ITEM_LAYOUT} ${disabled ? "cursor-not-allowed text-mute" : toneClass}`;
  const role = checked === undefined ? "menuitem" : "menuitemradio";

  if (href && !disabled) {
    return (
      <Link
        href={href}
        role={role}
        aria-checked={checked}
        tabIndex={-1}
        onClick={close}
        className={cls}
      >
        {icon}
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role={role}
      tabIndex={-1}
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (disabled) return;
        close();
        onSelect?.();
      }}
      className={cls}
    >
      {icon}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="mx-1.5 my-1 h-px bg-edge" />;
}
