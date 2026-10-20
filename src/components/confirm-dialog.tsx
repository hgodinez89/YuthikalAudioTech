"use client";

import { TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

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
  error = null,
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
  /** Fallo al confirmar (el diálogo sigue abierto para reintentar). */
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const messageId = useId();
  if (!open) return null;

  return (
    <Modal
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={messageId}
      role="alertdialog"
    >
      <div className="w-full max-w-[420px] rounded-[20px] border border-edge-2 bg-surface px-7 pb-6 pt-8 text-center shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
        <div className="mx-auto mb-5 grid size-[52px] place-items-center rounded-full border border-warn/30 bg-warn/10 text-warn">
          <TriangleAlert size={24} strokeWidth={2.2} />
        </div>
        <h2 id={titleId} className="mb-3 text-[19px] font-extrabold tracking-[-0.01em]">
          {title}
        </h2>
        <p id={messageId} className="mb-7 text-[14.5px] leading-[1.55] text-sub">
          {message}
        </p>
        {error && (
          <p role="alert" className="-mt-3 mb-5 text-[13px] font-semibold text-warn">
            {error}
          </p>
        )}
        <div className="flex justify-center gap-2.5">
          <Button data-autofocus onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {confirmIcon}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
