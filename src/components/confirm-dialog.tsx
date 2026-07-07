"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/**
 * Confirmación destructiva del design system (reemplaza a window.confirm).
 * Cancelar tiene el foco inicial; Esc o clic fuera cancelan.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmIcon,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-[20px] border border-edge-2 bg-surface px-7 pb-6 pt-8 text-center shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="mx-auto mb-5 grid size-[52px] place-items-center rounded-full border border-warn/30 bg-warn/10 text-warn">
          <TriangleAlert size={24} strokeWidth={2.2} />
        </div>
        <h2 className="mb-3 text-[19px] font-extrabold tracking-[-0.01em]">{title}</h2>
        <p className="mb-7 text-[14.5px] leading-[1.55] text-sub">{message}</p>
        <div className="flex justify-center gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[11px] bg-warn px-5 py-[11px] text-sm font-bold text-page disabled:opacity-60"
          >
            {confirmIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
