"use client";

import { ChevronLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useOnline } from "@/lib/use-online";
import { Button } from "./button";
import { ChordVisual } from "./chord-visual";
import { Menu, MenuItem } from "./menu";
import { FIELD_CLASS } from "./playlist-form-modal";
import { useToast } from "./toast";
import { deleteCustomChord } from "@/lib/custom-chord-actions";

/* El constructor se descarga al abrirlo (o al pasar el cursor por sus
   botones), no al entrar a la página. */
const loadBuilder = () => import("./chord-builder");
const ChordBuilder = dynamic(() => loadBuilder().then((m) => m.ChordBuilder));
import type { CustomChordRow } from "@/lib/custom-chords";
import type { Instrument } from "@/lib/instruments";

/**
 * "Mis acordes": la biblioteca personal del instrumento. Buscar, crear,
 * editar y borrar (con «Deshacer»). Estos acordes se usan en tus canciones
 * antes que los del catálogo.
 */
export function MyChords({
  instrument,
  chords,
}: {
  instrument: Instrument;
  chords: CustomChordRow[];
}) {
  const t = useTranslations("myChords");
  const tOffline = useTranslations("offline");
  /* Sin conexión la biblioteca es solo consulta: crear, editar y borrar, no. */
  const offline = !useOnline();
  const tInstruments = useTranslations("instruments");
  const toast = useToast();
  const [items, setItems] = useState(chords);
  const [search, setSearch] = useState("");
  const [builder, setBuilder] = useState<CustomChordRow | "new" | null>(null);

  const needle = search.trim().toLowerCase();
  const listed = items.filter((c) => !toast.hidden.has(c.id));
  const visible = listed
    .filter((c) => c.name.toLowerCase().includes(needle))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const remove = (chord: CustomChordRow) =>
    toast.defer({
      message: t("deleted", { name: chord.name }),
      hides: chord.id,
      commit: async () => {
        const result = await deleteCustomChord(chord.id);
        // La acción ya revalida: sin un segundo refresco (la tarjeta sigue oculta).
        if (!result.ok) return t(`errors.${result.error}`);
        return null;
      },
    });

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-[90px] pt-8 sm:px-7">
      <Link
        href={`/${instrument}/songs`}
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-sub hover:text-ink"
      >
        <ChevronLeft size={15} strokeWidth={2.2} />
        {t("back")}
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-[30px] font-extrabold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-[14px] text-tert">
            {t("count", {
              count: listed.length,
              instrument: tInstruments(`${instrument}.name`),
            })}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setBuilder("new")}
          onPointerEnter={() => void loadBuilder()}
          onFocus={() => void loadBuilder()}
          disabled={offline}
          title={offline ? tOffline("unavailable") : undefined}
        >
          <Plus size={16} strokeWidth={2.4} />
          {t("new")}
        </Button>
      </div>

      {listed.length > 0 && (
        <div className="relative mb-5 flex items-center">
          <Search
            size={17}
            strokeWidth={2}
            className="pointer-events-none absolute left-3.5 text-tert"
          />
          <label htmlFor="my-chords-search" className="sr-only">
            {t("search")}
          </label>
          <input
            id="my-chords-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className={`${FIELD_CLASS} h-11 pl-10`}
          />
        </div>
      )}

      {visible.length > 0 ? (
        <div
          inert={offline}
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5"
        >
          {visible.map((chord) => (
            <article
              key={chord.id}
              className="relative flex flex-col items-center rounded-2xl border border-edge bg-surface px-3 pb-3.5 pt-9 shadow-card"
            >
              <div className="absolute right-1.5 top-1.5 has-[[aria-expanded=true]]:z-30">
                <Menu
                  label={t("actions", { name: chord.name })}
                  trigger={{
                    "aria-label": t("actions", { name: chord.name }),
                    className:
                      "grid size-9 cursor-pointer place-items-center rounded-[10px] text-mute hover:bg-edge hover:text-ink",
                    children: <span className="text-lg leading-none">⋯</span>,
                  }}
                  panelClassName="absolute right-0 top-[38px] z-40 w-[170px] rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop"
                >
                  <MenuItem
                    icon={<Pencil size={15} strokeWidth={2} />}
                    onSelect={() => setBuilder(chord)}
                  >
                    {t("edit")}
                  </MenuItem>
                  <MenuItem
                    tone="danger"
                    icon={<Trash2 size={15} strokeWidth={2} />}
                    onSelect={() => remove(chord)}
                  >
                    {t("delete")}
                  </MenuItem>
                </Menu>
              </div>
              <button
                type="button"
                onClick={() => setBuilder(chord)}
                onPointerEnter={() => void loadBuilder()}
                aria-label={t("editNamed", { name: chord.name })}
                className="flex cursor-pointer flex-col items-center"
              >
                <span className="pb-2.5">
                  <ChordVisual
                    chord={{
                      frets: chord.frets,
                      barres: chord.barres,
                      baseFret: chord.base_fret,
                      keys: chord.keys.length ? chord.keys : undefined,
                    }}
                    scale={chord.keys.length ? 1.1 : 1}
                  />
                </span>
                <span className="text-[17px] font-extrabold">{chord.name}</span>
              </button>
            </article>
          ))}
        </div>
      ) : needle ? (
        <p className="px-5 py-12 text-center text-[14px] text-tert">
          {t("noResults", { query: search.trim() })}
        </p>
      ) : (
        <div className="flex flex-col items-center rounded-[18px] border border-dashed border-edge-2 bg-surface-3 px-5 py-[60px] text-center">
          <h2 className="mb-2 text-lg font-bold">{t("emptyTitle")}</h2>
          <p className="mb-[22px] max-w-[420px] text-sm text-tert">{t("emptyDesc")}</p>
          <Button
            variant="primary"
            onClick={() => setBuilder("new")}
            onPointerEnter={() => void loadBuilder()}
            onFocus={() => void loadBuilder()}
            disabled={offline}
            title={offline ? tOffline("unavailable") : undefined}
          >
            <Plus size={16} strokeWidth={2.4} />
            {t("new")}
          </Button>
        </div>
      )}

      {builder && (
        <ChordBuilder
          instrument={instrument}
          initial={builder === "new" ? undefined : builder}
          onClose={() => setBuilder(null)}
          onSaved={(chord) => {
            setItems((prev) => [...prev.filter((c) => c.id !== chord.id), chord]);
            setBuilder(null);
            toast.show({ message: t("saved", { name: chord.name }) });
          }}
        />
      )}
    </div>
  );
}
