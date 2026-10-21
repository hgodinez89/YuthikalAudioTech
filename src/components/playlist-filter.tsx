"use client";

import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useId,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Link } from "@/i18n/navigation";
import type { PlaylistWithCount } from "@/lib/playlists";
import { buttonClass, chipClass, labelClass } from "./button";
import { FadeRow } from "./fade-row";
import { Modal } from "./modal";

/** Chips visibles además de «Todas»; el resto vive en el panel. */
const FEATURED = 5;
/** Con más playlists que esto, el panel muestra el buscador. */
const SEARCH_FROM = 8;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Enlace a un filtro (null: «Todas»). Un clic normal cambia la playlist sin
 * ir al servidor; Ctrl/⌘/clic medio siguen abriendo otra pestaña. Sin
 * precarga: todas las canciones ya están en la página.
 */
function FilterLink({
  base,
  listId,
  onPick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "prefetch" | "onClick"> & {
  base: string;
  listId: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <Link
      {...props}
      href={listId ? `${base}?list=${listId}` : base}
      prefetch={false}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onPick(listId);
      }}
    />
  );
}

/**
 * Playlists como filtros: «Todas» + las de más canciones (y la activa, si no
 * está entre ellas). Las demás, y «Nuevo playlist», en el panel «+N».
 */
export function PlaylistFilter({
  base,
  playlists,
  activeListId,
  onSelect,
  onNewList,
  canCreate = true,
}: {
  base: string;
  playlists: PlaylistWithCount[];
  activeListId: string | null;
  onSelect: (id: string | null) => void;
  onNewList: () => void;
  /** Sin conexión no se crean playlists (solo consulta). */
  canCreate?: boolean;
}) {
  const t = useTranslations("songs");
  const tPlaylists = useTranslations("playlists");
  /* Posición del chip «+N» al abrir el panel (null: cerrado). */
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  // Más canciones primero; a igualdad, la más nueva (el orden del servidor).
  const featured = [...playlists]
    .sort((a, b) => b.songs_count - a.songs_count)
    .slice(0, FEATURED);
  const active = playlists.find((p) => p.id === activeListId) ?? null;
  if (active && !featured.includes(active)) featured.push(active);
  const hidden = playlists.length - featured.length;

  return (
    <>
      <FadeRow
        role="group"
        aria-label={tPlaylists("title")}
        className="-mx-5 -mt-1.5 mb-[18px] flex items-center gap-2 overflow-x-auto px-5 py-1.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {/* El grupo ya se anuncia con su aria-label. */}
        <span aria-hidden className={`${labelClass} mr-1`}>
          {tPlaylists("filterLabel")}
        </span>
        <FilterLink
          base={base}
          listId={null}
          onPick={onSelect}
          aria-current={!active ? "page" : undefined}
          className={chipClass({ active: !active })}
        >
          {t("all")}
        </FilterLink>
        {featured.map((p) => (
          <FilterLink
            key={p.id}
            base={base}
            listId={p.id}
            onPick={onSelect}
            title={p.name}
            aria-current={p === active ? "page" : undefined}
            className={chipClass({ active: p === active })}
          >
            <span className="max-w-[160px] truncate">{p.name}</span>
            <span className="text-[11.5px] opacity-70">{p.songs_count}</span>
          </FilterLink>
        ))}
        {hidden > 0 ? (
          <button
            type="button"
            onClick={(e) => setAnchor(e.currentTarget.getBoundingClientRect())}
            aria-haspopup="dialog"
            aria-expanded={anchor !== null}
            aria-label={tPlaylists("moreLabel", { n: hidden })}
            className={chipClass({ active: false })}
          >
            +{hidden}
            <ChevronDown size={14} strokeWidth={2.4} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onNewList}
            disabled={!canCreate}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-edge-2 px-3.5 py-[7px] text-[13px] font-semibold text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} strokeWidth={2.4} />
            {tPlaylists("newPlaylist")}
          </button>
        )}
      </FadeRow>

      {anchor && (
        <PlaylistPanel
          anchor={anchor}
          base={base}
          playlists={playlists}
          activeId={active?.id ?? null}
          onClose={() => setAnchor(null)}
          onSelect={onSelect}
          onNewList={onNewList}
          canCreate={canCreate}
        />
      )}
    </>
  );
}

/**
 * Todas las playlists: desplegable bajo el chip en escritorio y hoja
 * inferior en móvil. ↑/↓ recorren la lista.
 */
function PlaylistPanel({
  anchor,
  base,
  playlists,
  activeId,
  onClose,
  onSelect,
  onNewList,
  canCreate,
}: {
  canCreate: boolean;
  anchor: DOMRect;
  base: string;
  playlists: PlaylistWithCount[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string | null) => void;
  onNewList: () => void;
}) {
  const t = useTranslations("songs");
  const tPlaylists = useTranslations("playlists");
  const locale = useLocale();
  const titleId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");

  // Solo se monta tras un clic: window existe. En móvil, el foco no va al
  // buscador para que el teclado no tape la lista.
  const desktop = window.matchMedia("(min-width: 640px)").matches;
  const position = {
    "--x": `${Math.min(anchor.left, window.innerWidth - 336)}px`,
    "--y": `${anchor.bottom + 8}px`,
  } as CSSProperties;

  const needle = fold(query.trim());
  const rows = [...playlists]
    .sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" }))
    .filter((p) => !needle || fold(p.name).includes(needle));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-row]")];
    if (items.length === 0) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown" ? (i + 1) % items.length : i <= 0 ? items.length - 1 : i - 1;
    items[next].focus();
  };

  const row = (listId: string | null, name: string, current: boolean, count?: number) => (
    <FilterLink
      key={listId ?? "all"}
      data-row
      base={base}
      listId={listId}
      onPick={(id) => {
        onClose();
        onSelect(id);
      }}
      aria-current={current ? "page" : undefined}
      className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-[14px] hover:bg-edge sm:py-2"
    >
      <Check
        size={15}
        strokeWidth={2.4}
        className={current ? "shrink-0 text-accent" : "invisible shrink-0"}
      />
      <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
      {count !== undefined && (
        <span className="text-[12px] tabular-nums text-tert">{count}</span>
      )}
    </FilterLink>
  );

  return (
    <Modal onClose={onClose} labelledBy={titleId} variant="anchored" backdrop="mobile">
      <div
        onKeyDown={onKeyDown}
        style={position}
        className="fixed inset-x-0 bottom-0 flex max-h-[75dvh] flex-col overflow-hidden rounded-t-[20px] border border-edge-2 bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop sm:inset-auto sm:left-[var(--x)] sm:top-[var(--y)] sm:max-h-[min(440px,calc(100dvh_-_var(--y)_-_16px))] sm:w-[320px] sm:rounded-2xl sm:pb-0"
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-edge-2 sm:hidden"
        />
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 sm:pt-3.5">
          <h2 id={titleId} className="text-[15px] font-bold">
            {tPlaylists("allTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="yk-hit relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub hover:text-ink"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {playlists.length > SEARCH_FROM && (
          <div className="relative mx-4 mb-1.5 flex items-center">
            <Search size={15} strokeWidth={2} className="absolute left-3 text-mute" />
            <label htmlFor={searchId} className="sr-only">
              {tPlaylists("search")}
            </label>
            <input
              id={searchId}
              data-autofocus={desktop || undefined}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tPlaylists("search")}
              className="h-[38px] w-full rounded-[10px] border border-edge bg-surface-2 pl-9 pr-3 text-[13.5px] text-ink outline-none focus:border-accent"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {!needle && row(null, t("all"), activeId === null)}
          {rows.map((p) => row(p.id, p.name, p.id === activeId, p.songs_count))}
          {rows.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-tert">
              {tPlaylists("noResults")}
            </p>
          )}
        </div>

        <div className="border-t border-edge p-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewList();
            }}
            disabled={!canCreate}
            className={`${buttonClass("secondary", "sm")} w-full`}
          >
            <Plus size={15} strokeWidth={2.4} />
            {tPlaylists("newPlaylist")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
