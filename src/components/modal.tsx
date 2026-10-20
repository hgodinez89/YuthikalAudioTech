"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal del design system sobre `<dialog>` nativo (showModal): el resto de la
 * página queda inerte, el foco no se escapa, Escape y clic fuera cierran, y al
 * cerrar el foco vuelve a quien lo abrió. Se monta abierto: el padre decide
 * cuándo renderizarlo. El foco inicial va al elemento con `data-autofocus`
 * (o, si no hay, al primero que pueda recibirlo).
 *
 * `children` es el panel: cada modal conserva su tamaño y su estructura.
 */
export function Modal({
  onClose,
  labelledBy,
  describedBy,
  label,
  role,
  variant = "center",
  backdrop = "dim",
  children,
}: {
  onClose: () => void;
  /** id del título visible (preferido) o, si no hay, `label`. */
  labelledBy?: string;
  /** id del texto que explica el diálogo (confirmaciones). */
  describedBy?: string;
  label?: string;
  /** "alertdialog" para confirmaciones destructivas. */
  role?: "dialog" | "alertdialog";
  /**
   * center: panel centrado; drawer: panel a la derecha, de alto completo;
   * anchored: el panel se posiciona solo (absolute), junto a lo que lo abrió.
   */
  variant?: "center" | "drawer" | "anchored";
  /** light: velo más suave para selectores rápidos sobre el contenido. */
  backdrop?: "dim" | "light";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  /* El clic que cierra debe empezar y terminar en el fondo (no al soltar una
     selección de texto fuera del panel). */
  const downOnBackdrop = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      dialog.close();
      // Devolver el foco a quien abrió el modal, si sigue en la página.
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(e) => {
        // Escape: React decide si se cierra (el padre desmonta el modal).
        e.preventDefault();
        onCloseRef.current();
      }}
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onCloseRef.current();
        downOnBackdrop.current = false;
      }}
      className={`fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overscroll-contain border-0 text-ink backdrop:bg-transparent ${
        backdrop === "light"
          ? "bg-page/55 backdrop-blur-[3px]"
          : "bg-page/70 backdrop-blur-[6px]"
      } ${
        variant === "drawer"
          ? "justify-end p-0 open:flex"
          : variant === "anchored"
            ? "p-0 open:block"
            : "items-center justify-center p-4 open:flex sm:p-6"
      }`}
    >
      {children}
    </dialog>
  );
}

/** Panel estándar centrado (tarjeta con borde, sombra y scroll propio). */
export const MODAL_PANEL =
  "max-h-[90vh] w-full overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]";

/** Cabecera de modal: título (con id para `labelledBy`), subtítulo y cerrar. */
export function ModalHeader({
  id,
  title,
  subtitle,
  closeLabel,
  onClose,
  className = "",
}: {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 border-b border-edge px-6 py-5 ${className}`}
    >
      <div className="min-w-0">
        <h2 id={id} className="truncate text-[19px] font-extrabold">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-tert">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub hover:text-ink"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/** Pie de modal con las acciones alineadas a la derecha. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-4">
      {children}
    </div>
  );
}
