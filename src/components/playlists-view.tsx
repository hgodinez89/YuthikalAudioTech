"use client";

import { Music, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "./confirm-dialog";
import { PlaylistFormModal } from "./playlist-form-modal";
import { StarsRow } from "./stars";
import { createPlaylist, deletePlaylist } from "@/lib/playlist-actions";
import type { PlaylistInput, PlaylistRow } from "@/lib/playlists";

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

export type PlaylistWithCount = PlaylistRow & { songs_count: number };

export function PlaylistsView({ playlists }: { playlists: PlaylistWithCount[] }) {
  const t = useTranslations("playlists");
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlaylistRow | null>(null);
  const [pending, startTransition] = useTransition();

  const genreLabel = (p: PlaylistRow) =>
    p.genre === "other" && p.genre_other ? p.genre_other : t(`genres.${p.genre}`);

  const create = async (input: PlaylistInput) => {
    const result = await createPlaylist(input);
    if (!result.ok) return result.error;
    router.refresh();
    return null;
  };

  const confirmRemove = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deletePlaylist(deleteTarget.id);
      setDeleteTarget(null);
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
          onClick={() => setModalOpen(true)}
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
                  onClick={() => setDeleteTarget(p)}
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
                {t("songCount", { count: p.songs_count })}
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
            onClick={() => setModalOpen(true)}
            className="yk-gradient inline-flex cursor-pointer items-center gap-[9px] rounded-xl px-[22px] py-3 text-[14.5px] font-bold"
          >
            <Plus size={17} strokeWidth={2.4} />
            {t("emptyCta")}
          </button>
        </div>
      )}

      {/* CONFIRMACIÓN DE BORRADO */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("deleteModal.title")}
        message={
          deleteTarget &&
          t.rich("deleteModal.message", {
            name: deleteTarget.name,
            b: (chunks) => <span className="font-bold text-ink">{chunks}</span>,
          })
        }
        cancelLabel={t("cancel")}
        confirmLabel={pending ? t("deleteModal.deleting") : t("deleteModal.confirm")}
        confirmIcon={<Trash2 size={15} strokeWidth={2.2} />}
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      />

      {/* MODAL NUEVO PLAYLIST */}
      {modalOpen && (
        <PlaylistFormModal
          title={t("newPlaylist")}
          submitLabel={t("create")}
          submittingLabel={t("creating")}
          initial={EMPTY_FORM}
          onClose={() => setModalOpen(false)}
          onSubmit={create}
        />
      )}
    </div>
  );
}
