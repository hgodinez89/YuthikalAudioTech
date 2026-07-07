"use client";

import { Music, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createPlaylist, deletePlaylist } from "@/lib/playlist-actions";
import {
  GENRES,
  validatePlaylist,
  type Genre,
  type PlaylistInput,
  type PlaylistRow,
} from "@/lib/playlists";

/* Estrella del prototipo: rellena en cian, vacía con trazo gris. */
function Star({ filled, size = 15 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "var(--accent)" : "none"}
      stroke={filled ? "var(--accent)" : "var(--disabled)"}
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.5 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

function StarsRow({ value, size }: { value: number; size?: number }) {
  return (
    <span className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= value} size={size} />
      ))}
    </span>
  );
}

function StarsInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <span className="mb-[9px] block text-[12.5px] font-semibold text-sub">{label}</span>
      <div className="flex gap-[5px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            aria-label={`${label}: ${i}`}
            className="cursor-pointer leading-none"
          >
            <Star filled={i <= value} size={26} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* Ilustración del estado vacío (guitarra + onda, Playlists.dc.html). */
function EmptyArt() {
  return (
    <svg
      width={120}
      height={90}
      viewBox="0 0 120 90"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M6 62h12l6-14 8 26 8-40 8 30 8-18 6 16h12"
        stroke="var(--accent)"
        opacity={0.55}
      />
      <path d="M84 30l-8 8" />
      <path d="M76 38c-4-4-11-3-15 1s-6 13-1 18 14 4 18 0 3-11-2-15z" />
      <circle cx={70} cy={50} r={5} />
    </svg>
  );
}

const EMPTY_FORM: PlaylistInput = {
  name: "",
  description: "",
  genre: "ballad",
  genreOther: "",
  ratingLike: 4,
  ratingDifficulty: 2,
};

const FIELD_CLASS =
  "w-full rounded-[11px] border border-edge bg-surface-2 px-3.5 text-[14.5px] text-ink outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_3px_rgba(53,214,232,0.14)]";

export function PlaylistsView({ initialPlaylists }: { initialPlaylists: PlaylistRow[] }) {
  const t = useTranslations("playlists");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PlaylistInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const playlists = initialPlaylists;

  const genreLabel = (p: PlaylistRow) =>
    p.genre === "other" && p.genre_other ? p.genre_other : t(`genres.${p.genre}`);

  const submit = () => {
    const invalid = validatePlaylist(form);
    if (invalid) {
      setFormError(t(`errors.${invalid}`));
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const result = await createPlaylist(form);
      if (!result.ok) {
        setFormError(t(`errors.${result.error}`));
        return;
      }
      setModalOpen(false);
      router.refresh();
    });
  };

  const remove = (playlist: PlaylistRow) => {
    if (!window.confirm(t("confirmDelete", { name: playlist.name }))) return;
    startTransition(async () => {
      await deletePlaylist(playlist.id);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-[1120px] px-7 pb-[90px] pt-10">
      {/* TÍTULO */}
      <div className="mb-[30px] flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mb-1.5 text-[32px] font-extrabold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-[14.5px] text-tert">
            {t("count", { count: playlists.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setFormError(null);
            setModalOpen(true);
          }}
          className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-5 py-3 text-[14.5px] font-bold"
        >
          <Plus size={17} strokeWidth={2.4} />
          {t("newPlaylist")}
        </button>
      </div>

      {/* GRID */}
      {playlists.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[18px]">
          {playlists.map((p) => (
            <article
              key={p.id}
              className="group relative flex flex-col rounded-[18px] border border-edge bg-surface p-[22px] transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-edge-2"
            >
              <Link
                href={`/playlists/${p.id}`}
                className="absolute inset-0"
                aria-label={p.name}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="mb-1 truncate text-lg font-bold">{p.name}</h3>
                  <p className="text-[13.5px] leading-[1.45] text-sub">{p.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  aria-label={t("delete")}
                  className="relative z-10 grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-lg text-mute opacity-0 transition-opacity hover:bg-edge hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
              <div className="mb-4 mt-3.5">
                <span className="inline-flex rounded-full border border-edge-2 bg-surface-2 px-[11px] py-1 text-xs font-semibold">
                  {genreLabel(p)}
                </span>
              </div>
              <div className="flex flex-col gap-2 border-y border-edge py-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-sub">{t("like")}</span>
                  <StarsRow value={p.rating_like} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] text-sub">{t("difficulty")}</span>
                  <StarsRow value={p.rating_difficulty} />
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-2 text-[13px] text-tert">
                <Music size={15} strokeWidth={2} className="text-accent" />
                {t("songCount", { count: 0 })}
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* ESTADO VACÍO */
        <div className="flex flex-col items-center px-5 py-[70px] text-center">
          <div className="mb-5 text-edge-2">
            <EmptyArt />
          </div>
          <h2 className="mb-2 text-xl font-bold">{t("emptyTitle")}</h2>
          <p className="mb-6 max-w-[360px] text-[14.5px] text-tert">{t("emptyDesc")}</p>
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(null);
              setModalOpen(true);
            }}
            className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-[22px] py-3 text-[14.5px] font-bold"
          >
            <Plus size={17} strokeWidth={2.4} />
            {t("emptyCta")}
          </button>
        </div>
      )}

      {/* MODAL NUEVO PLAYLIST */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-6 backdrop-blur-[6px]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between border-b border-edge px-6 py-[22px]">
              <h2 className="text-[19px] font-extrabold">{t("newPlaylist")}</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
              {formError && (
                <p className="text-[13px] font-semibold text-warn">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-[18px]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
                {pending ? t("creating") : t("create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
