"use client";

import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Button } from "./button";
import { ChordSheet } from "./chord-sheet";
import { Modal, ModalFooter, ModalHeader } from "./modal";
import { chordsOverLyricsToChordPro } from "@/lib/chord-import";
import { parseChordPro } from "@/lib/chordpro";

/** Pegar un cifrado "acordes encima de la letra" y convertirlo a ChordPro. */
export function PasteChordsModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (chordPro: string) => void;
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const titleId = useId();
  const [raw, setRaw] = useState("");
  const converted = useMemo(() => chordsOverLyricsToChordPro(raw), [raw]);
  const preview = useMemo(() => parseChordPro(converted), [converted]);

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <div className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]">
        <ModalHeader
          id={titleId}
          title={t("paste.title")}
          subtitle={t("paste.hint")}
          closeLabel={tSongs("close")}
          onClose={onClose}
        />
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <textarea
            data-autofocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={t("paste.placeholder")}
            spellCheck={false}
            aria-label={t("paste.title")}
            className="min-h-[300px] resize-none whitespace-pre rounded-2xl border border-edge bg-surface-3 px-4 py-3.5 font-mono text-[13px] leading-[1.7] text-ink outline-none focus:border-accent dark:bg-[#0b0d12]"
          />
          <div className="min-h-[300px] overflow-auto rounded-2xl border border-edge px-5 py-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-tert">
              <Eye size={14} strokeWidth={2} className="text-accent" />
              {t("preview")}
            </div>
            {preview.sections.length ? (
              <ChordSheet
                sections={preview.sections}
                chords={{}}
                showLegend={false}
                showFab={false}
              />
            ) : (
              <p className="text-sm text-tert">{t("paste.previewEmpty")}</p>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button onClick={onClose}>{tSongs("cancel")}</Button>
          <Button
            variant="primary"
            disabled={!converted}
            onClick={() => onInsert(converted)}
          >
            {t("paste.insert")}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
