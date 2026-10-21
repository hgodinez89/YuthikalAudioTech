"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Menu, MenuItem, MenuSeparator } from "./menu";
import type { Snippet } from "@/lib/chordpro";

/* Leyenda del editor convertida en botonera: cada chip conserva el color de
   su sintaxis e inserta en el cursor (ver insertSnippet). */

const CHIP =
  "inline-flex cursor-pointer items-center gap-[5px] rounded-md px-1.5 py-1 text-[11px] text-mute hover:bg-edge hover:text-ink";
/* En móvil los chips ocupan dos filas: el panel toma el ancho de la pantalla
   (16 px de margen) justo debajo de su botón, para no salirse por un borde,
   con scroll propio y por encima de la barra inferior. */
const PANEL =
  "absolute right-0 top-[30px] z-40 w-[270px] overflow-hidden rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:z-50 max-sm:mt-1 max-sm:max-h-[50dvh] max-sm:w-auto max-sm:overflow-y-auto";
const ITEM = "flex-col items-start gap-0.5 rounded-[9px] px-3 py-2";

function Swatch({ className }: { className: string }) {
  return (
    <span aria-hidden className={`size-[9px] shrink-0 rounded-[2px] ${className}`} />
  );
}

/** Opción de menú: nombre, ejemplo de sintaxis y para qué sirve. */
function Option({ title, code, hint }: { title: string; code: string; hint?: string }) {
  return (
    <>
      <span className="flex w-full items-baseline justify-between gap-3 text-[13.5px] font-semibold">
        {title}
        <code className="shrink-0 font-mono text-[11px] font-normal text-directive">
          {code}
        </code>
      </span>
      {hint && <span className="text-[11.5px] text-tert">{hint}</span>}
    </>
  );
}

export function ChordproInsert({
  onInsert,
  onChord,
  onStrum,
}: {
  onInsert: (snippet: Snippet) => void;
  /** Abre el selector de acordes junto al botón (x, y de la ventana). */
  onChord: (x: number, y: number) => void;
  onStrum: () => void;
}) {
  const t = useTranslations("editor");
  const tl = (key: string) => t(`insert.${key}`);
  const ph = (key: string) => t(`insert.placeholder.${key}`);

  const line = (
    before: string,
    placeholder: string,
    after: string,
    wrap?: Snippet["wrap"],
  ) => onInsert({ before, placeholder, after, line: true, wrap });
  const block = (tag: "verse" | "chorus" | "bridge") =>
    line(`{start_of_${tag}}\n`, ph("lyrics"), `\n{end_of_${tag}}`, "lines");

  const menu = (label: string, swatch: string, text: ReactNode, children: ReactNode) => (
    <Menu
      label={label}
      trigger={{
        className: CHIP,
        "aria-label": label,
        title: label,
        children: (
          <>
            <Plus size={11} strokeWidth={2.6} aria-hidden />
            <Swatch className={swatch} />
            {text}
            <ChevronDown size={11} strokeWidth={2.4} aria-hidden />
          </>
        ),
      }}
      panelClassName={PANEL}
    >
      {children}
    </Menu>
  );

  return (
    <div
      role="toolbar"
      aria-label={tl("label")}
      className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1"
    >
      <button
        type="button"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onChord(r.left + r.width / 2, r.bottom + 6);
        }}
        aria-label={tl("chord")}
        title={tl("chord")}
        className={CHIP}
      >
        <Plus size={11} strokeWidth={2.6} aria-hidden />
        <Swatch className="bg-accent" />[{t("legendChord")}]
      </button>

      {menu(
        tl("directive"),
        "bg-directive",
        <>
          {"{"}
          {t("legendDirective")}
          {"}"}
        </>,
        <>
          <MenuItem onSelect={onStrum} className={ITEM}>
            <Option title={tl("strum")} code="{strum: D U}" hint={tl("strumHint")} />
          </MenuItem>
          <MenuItem onSelect={() => line("| ", "Am | G", " | x2")} className={ITEM}>
            <Option
              title={tl("instrumental")}
              code="| Am | G | x2"
              hint={tl("instrumentalHint")}
            />
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            onSelect={() => line("{artist: ", ph("artist"), "}")}
            className={ITEM}
          >
            <Option title={tl("artist")} code="{artist: …}" hint={tl("artistHint")} />
          </MenuItem>
          <MenuItem onSelect={() => line("{capo: ", "3", "}")} className={ITEM}>
            <Option title={tl("capo")} code="{capo: 3}" hint={tl("capoHint")} />
          </MenuItem>
          <MenuItem onSelect={() => line("{tempo: ", "90", "}")} className={ITEM}>
            <Option title={tl("tempo")} code="{tempo: 90}" hint={tl("tempoHint")} />
          </MenuItem>
        </>,
      )}

      {menu(
        tl("section"),
        "bg-directive",
        <span className="font-bold">[[{t("legendSection")}]]</span>,
        <>
          {(["intro", "verse", "chorus", "bridge", "solo", "outro"] as const).map(
            (key) => {
              const name = tl(`names.${key}`);
              return (
                <MenuItem
                  key={key}
                  onSelect={() => line("[[", name, "]]")}
                  className={ITEM}
                >
                  <Option title={name} code={`[[${name}]]`} />
                </MenuItem>
              );
            },
          )}
          <MenuItem onSelect={() => line("[[", ph("name"), "]]")} className={ITEM}>
            <Option title={tl("customName")} code="[[…]]" />
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => block("verse")} className={ITEM}>
            <Option
              title={tl("blockVerse")}
              code="{start_of_verse}"
              hint={tl("blockHint")}
            />
          </MenuItem>
          <MenuItem onSelect={() => block("chorus")} className={ITEM}>
            <Option
              title={tl("blockChorus")}
              code="{start_of_chorus}"
              hint={tl("blockHint")}
            />
          </MenuItem>
          <MenuItem onSelect={() => block("bridge")} className={ITEM}>
            <Option
              title={tl("blockBridge")}
              code="{start_of_bridge}"
              hint={tl("blockHint")}
            />
          </MenuItem>
        </>,
      )}

      <button
        type="button"
        onClick={() => line("{c: ", ph("note"), "}", "text")}
        aria-label={tl("note")}
        title={tl("note")}
        className={`${CHIP} italic`}
      >
        <Plus size={11} strokeWidth={2.6} aria-hidden />
        <Swatch className="bg-tert" />
        {"{c: "}
        {t("legendNote")}
        {"}"}
      </button>
    </div>
  );
}
