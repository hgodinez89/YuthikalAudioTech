"use client";

import { Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";
import { arrowsToStrum, strumToArrows } from "@/lib/chordpro";

/** Selector de rasgueo del modo visual: ↓ ↑ – y borrar, sobre un velo suave. */
export function StrumBuilder({
  initial,
  onSave,
  onClose,
}: {
  initial: string | null;
  onSave: (strum: string | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations("editor");
  const titleId = useId();
  const [tokens, setTokens] = useState<string[]>(
    initial ? strumToArrows(initial).split(" ") : [],
  );

  return (
    <Modal onClose={onClose} labelledBy={titleId} backdrop="light">
      <div className="w-[320px] max-w-full rounded-2xl border border-edge-2 bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <h3 id={titleId} className="mb-3 text-[15px] font-extrabold">
          {t("strumTitle")}
        </h3>
        <div
          aria-live="polite"
          className="mb-4 flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-edge bg-surface-2 px-3 py-2 text-lg tracking-[0.1em] text-accent"
        >
          {tokens.length ? (
            tokens.join(" ")
          ) : (
            <span className="text-sm text-mute">{t("strumEmpty")}</span>
          )}
        </div>
        <div className="mb-4 flex justify-center gap-2">
          {["↓", "↑", "–"].map((symbol) => (
            <button
              key={symbol}
              type="button"
              onClick={() => setTokens([...tokens, symbol])}
              className="grid size-11 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-lg font-bold text-ink hover:border-accent"
            >
              {symbol}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTokens(tokens.slice(0, -1))}
            aria-label={t("strumBackspace")}
            title={t("strumBackspace")}
            className="grid size-11 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-sub hover:border-accent"
          >
            <Delete size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" className="text-warn" onClick={() => onSave(null)}>
            {t("strumRemove")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            data-autofocus
            onClick={() => onSave(tokens.length ? arrowsToStrum(tokens.join(" ")) : null)}
          >
            {t("strumSave")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
