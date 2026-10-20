"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Button } from "./button";
import { Modal, MODAL_PANEL, ModalFooter, ModalHeader } from "./modal";
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
  const id = useId();
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
      const serverError = await onSubmit(form).catch(() => "db");
      if (serverError) setError(t(`errors.${serverError}`));
      else onClose();
    });
  };

  return (
    <Modal onClose={onClose} labelledBy={`${id}-title`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`${MODAL_PANEL} max-w-[480px]`}
      >
        <ModalHeader
          id={`${id}-title`}
          title={title}
          closeLabel={t("close")}
          onClose={onClose}
        />

        <div className="flex flex-col gap-[18px] px-6 py-[22px]">
          <div>
            <label
              htmlFor={`${id}-name`}
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.name")}
            </label>
            <input
              id={`${id}-name`}
              data-autofocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("form.namePlaceholder")}
              maxLength={100}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-description`}
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.description")}
            </label>
            <textarea
              id={`${id}-description`}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("form.descriptionPlaceholder")}
              rows={2}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div>
            <label
              htmlFor={`${id}-genre`}
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("form.genre")}
            </label>
            <select
              id={`${id}-genre`}
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
              <label
                htmlFor={`${id}-genre-other`}
                className="mb-[7px] block text-[12.5px] font-semibold text-sub"
              >
                {t("form.genreOther")}
              </label>
              <input
                id={`${id}-genre-other`}
                value={form.genreOther}
                onChange={(e) => setForm({ ...form, genreOther: e.target.value })}
                placeholder={t("form.genreOtherPlaceholder")}
                maxLength={50}
                className={`${FIELD_CLASS} h-11`}
              />
            </div>
          )}
          <StarsInput
            label={t("like")}
            value={form.ratingLike}
            onChange={(v) => setForm({ ...form, ratingLike: v })}
          />
          {error && (
            <p role="alert" className="text-[13px] font-semibold text-warn">
              {error}
            </p>
          )}
        </div>

        <ModalFooter>
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? submittingLabel : submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
