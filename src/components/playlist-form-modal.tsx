"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { StarsInput } from "./stars";
import {
  GENRES,
  validatePlaylist,
  type Genre,
  type PlaylistInput,
} from "@/lib/playlists";

export const FIELD_CLASS =
  "w-full rounded-[11px] border border-edge bg-surface-2 px-3.5 text-[14.5px] text-ink outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_rgba(53,214,232,0.14)]";

/**
 * Formulario de playlist (crear y editar). El padre ejecuta la server
 * action en onSubmit y devuelve la clave de error o null si tuvo éxito.
 */
export function PlaylistFormModal({
  title,
  submitLabel,
  submittingLabel,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  submittingLabel: string;
  initial: PlaylistInput;
  onClose: () => void;
  onSubmit: (input: PlaylistInput) => Promise<string | null>;
}) {
  const t = useTranslations("playlists");
  const [form, setForm] = useState<PlaylistInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const invalid = validatePlaylist(form);
    if (invalid) {
      setError(t(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const serverError = await onSubmit(form);
      if (serverError) setError(t(`errors.${serverError}`));
      else onClose();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-edge px-6 py-[22px]">
          <h2 className="text-[19px] font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-8 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-col gap-[18px] px-6 py-[22px]">
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.name")}
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
              maxLength={100}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {t("form.genre")}
            </label>
            <select
              value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value as Genre })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {t(`genres.${g}`)}
                </option>
              ))}
            </select>
          </div>
          {form.genre === "other" && (
            <div>
              <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
                {t("form.genreOther")}
              </label>
              <input
                value={form.genreOther}
                onChange={(e) => setForm({ ...form, genreOther: e.target.value })}
                placeholder={t("form.genreOtherPlaceholder")}
                maxLength={50}
                className={`${FIELD_CLASS} h-11`}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-[26px]">
            <StarsInput
              label={t("like")}
              value={form.ratingLike}
              onChange={(v) => setForm({ ...form, ratingLike: v })}
            />
            <StarsInput
              label={t("difficulty")}
              value={form.ratingDifficulty}
              onChange={(v) => setForm({ ...form, ratingDifficulty: v })}
            />
          </div>
          {error && <p className="text-[13px] font-semibold text-warn">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-[18px]">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="yk-gradient cursor-pointer rounded-[11px] px-5 py-[11px] text-sm font-bold disabled:opacity-60"
          >
            {pending ? submittingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
