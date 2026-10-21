"use client";

import {
  Check,
  ClipboardPaste,
  CloudUpload,
  Code,
  Eye,
  Link2,
  Pencil,
  RotateCcw,
  Settings,
  TriangleAlert,
  Unlink2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "./button";
import { ChordBuilder } from "./chord-builder";
import { ChordPicker } from "./chord-picker";
import { ChordSheet, type ChordDataMap } from "./chord-sheet";
import { highlightLine } from "./chordpro-highlight";
import { ChordproInsert } from "./chordpro-insert";
import { PasteChordsModal } from "./paste-chords-modal";
import { SongChordsStrip } from "./song-chords-strip";
import { SongMetaDrawer, type PlaylistOption } from "./song-meta-drawer";
import { StrumBuilder } from "./strum-builder";
import { VisualEditor, type PickerTarget } from "./visual-editor";
import {
  buildVisualModel,
  collectChords,
  insertSnippet,
  parseChordPro,
  replaceInstrumentalToken,
  sectionHeaderAt,
  setChordAtUnit,
  setSectionStrum,
  type EditResult,
  type Snippet,
} from "@/lib/chordpro";
import { customChordData, type CustomChordRow } from "@/lib/custom-chords";
import type { Instrument } from "@/lib/instruments";
import { updateSongContent } from "@/lib/song-actions";
import { MAX_CONTENT_LENGTH, type SongRow } from "@/lib/songs";
import { useAutosave, type SaveState } from "@/lib/use-autosave";
import { useDeleteSong } from "@/lib/use-delete-song";
import { useOnline } from "@/lib/use-online";
import { useLinkedScroll } from "@/lib/use-linked-scroll";
import { useSectionTitle } from "@/lib/use-section-title";
import { useStoredFlag } from "@/lib/use-stored-flag";

/* El contador de caracteres aparece al acercarse al límite. */
const COUNTER_FROM = MAX_CONTENT_LENGTH * 0.9;

/**
 * Aplica una edición al textarea como si se tecleara (insertText): así entra
 * en el historial y Ctrl+Z la deshace. Solo se reemplaza el tramo que cambió;
 * si el navegador no lo admite, se fija el texto directamente.
 */
function applyEdit(
  textarea: HTMLTextAreaElement,
  current: string,
  next: EditResult,
  fallback: (content: string) => void,
) {
  let start = 0;
  while (
    start < current.length &&
    start < next.content.length &&
    current[start] === next.content[start]
  ) {
    start += 1;
  }
  let tail = 0;
  while (
    tail < current.length - start &&
    tail < next.content.length - start &&
    current[current.length - 1 - tail] === next.content[next.content.length - 1 - tail]
  ) {
    tail += 1;
  }
  const replacement = next.content.slice(start, next.content.length - tail);
  textarea.focus();
  textarea.setSelectionRange(start, current.length - tail);
  const ok = document.execCommand(
    replacement ? "insertText" : "delete",
    false,
    replacement,
  );
  if (!ok || textarea.value !== next.content) fallback(next.content);
  requestAnimationFrame(() => textarea.setSelectionRange(next.selStart, next.selEnd));
}

/** Posición del final de una línea (para dejar el cursor tras lo insertado). */
function lineEndOffset(content: string, lineIndex: number): number {
  const lines = content.split("\n");
  return lines.slice(0, lineIndex + 1).join("\n").length;
}

export function SongEditor({
  song,
  instrument,
  playlists,
  chords,
  customChords,
}: {
  song: SongRow;
  instrument: Instrument;
  playlists: PlaylistOption[];
  /** Diagramas de los acordes de la letra al abrir (catálogo y propios). */
  chords: ChordDataMap;
  /** Biblioteca del usuario para este instrumento (selector y constructor). */
  customChords: CustomChordRow[];
}) {
  const t = useTranslations("editor");
  const tOffline = useTranslations("offline");
  const sectionTitle = useSectionTitle();
  /* Sin conexión el editor es de solo lectura (no se podría guardar). */
  const offline = !useOnline();
  const offlineTitle = offline ? tOffline("unavailable") : undefined;

  const [content, setContent] = useState(song.content);
  const [subMode, setSubMode] = useState<"text" | "visual">("text");
  const [metaOpen, setMetaOpen] = useState(false);
  const router = useRouter();
  const deleteLater = useDeleteSong();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  /* Diagramas conocidos: al crear un acorde propio se suma sin recargar. */
  const [known, setKnown] = useState(chords);
  const [myChords, setMyChords] = useState(customChords);
  const [builderFor, setBuilderFor] = useState<string | null>(null);
  const [checked] = useState(() => new Set(collectChords(parseChordPro(song.content))));
  /* Rasgueo a definir: de una sección (encabezado) o, en modo texto sin
     sección, en la línea del cursor (headerLineIndex null). */
  const [strumTarget, setStrumTarget] = useState<{
    headerLineIndex: number | null;
    strum: string | null;
    text: boolean;
  } | null>(null);
  /* Selector de acordes del modo texto: se abre junto al botón «+ acorde». */
  const [textChord, setTextChord] = useState<{ x: number; y: number } | null>(null);

  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  /* Autosave con debounce: guarda también al salir y avisa si se cierra la
     pestaña con cambios. Se arma con la primera edición (detectada en render). */
  const [touched, setTouched] = useState(false);
  if (!touched && content !== song.content) setTouched(true);
  const autosave = useAutosave({
    value: content,
    dirty: touched,
    delay: 1200,
    save: (value) => updateSongContent(song.id, value),
  });
  const saveState = autosave.state;
  const tooLong = content.length > MAX_CONTENT_LENGTH;

  /* La vista previa usa un valor diferido: con letras largas, escribir no
     espera a que se vuelva a parsear y pintar todo el cifrado. */
  const previewContent = useDeferredValue(content);
  const parsed = useMemo(() => parseChordPro(previewContent), [previewContent]);
  const chordNames = useMemo(() => collectChords(parsed), [parsed]);
  const visualModel = useMemo(
    () => (subMode === "visual" ? buildVisualModel(content) : []),
    [subMode, content],
  );

  /* Scroll vinculado entre ChordPro y vista previa (por defecto sí, recordado). */
  const [scrollLinked, setScrollLinked] = useStoredFlag("yk-editor-scroll-link", true);
  const linked = useLinkedScroll({
    textRef: textareaRef,
    previewRef,
    sectionStartLines: parsed.sections.map((s) => s.startLine),
  });
  const toggleScrollLink = () => {
    const next = !scrollLinked;
    setScrollLinked(next);
    if (next) linked.relink();
    else linked.unlink();
  };

  const applyChord = (chord: string | null) => {
    if (!picker) return;
    if (picker.token) {
      // Acorde escrito como texto (o entre corchetes) en una línea instrumental.
      const text = chord && picker.token.bracketed ? `[${chord}]` : chord;
      setContent(replaceInstrumentalToken(content, picker.lineIndex, picker.token, text));
    } else {
      setContent(setChordAtUnit(content, picker.lineIndex, picker.unit, chord));
    }
    setPicker(null);
  };

  /* Botonera del modo texto: inserta en la selección actual del textarea. */
  const insert = (snippet: Snippet) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { value, selectionStart, selectionEnd } = textarea;
    applyEdit(
      textarea,
      value,
      insertSnippet(value, selectionStart, selectionEnd, snippet),
      setContent,
    );
  };
  /* Tras cerrar un modal (que devuelve el foco a su botón), en el cuadro siguiente. */
  const afterModal = (fn: () => void) => requestAnimationFrame(fn);

  const openTextStrum = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursorLine = content.slice(0, textarea.selectionStart).split("\n").length - 1;
    const section = sectionHeaderAt(content, cursorLine);
    setStrumTarget({
      headerLineIndex: section?.headerLineIndex ?? null,
      strum: section?.strum ?? null,
      text: true,
    });
  };

  const saveStrum = (strum: string | null) => {
    if (!strumTarget) return;
    const { headerLineIndex, text } = strumTarget;
    setStrumTarget(null);
    const textarea = textareaRef.current;
    if (!text || !textarea) {
      if (headerLineIndex !== null)
        setContent(setSectionStrum(content, headerLineIndex, strum));
      return;
    }
    afterModal(() => {
      const current = textarea.value;
      if (headerLineIndex !== null) {
        // Reemplaza (o crea, o quita) el {strum} bajo el encabezado de la sección.
        const next = setSectionStrum(current, headerLineIndex, strum);
        const caret = lineEndOffset(next, strum ? headerLineIndex + 1 : headerLineIndex);
        applyEdit(
          textarea,
          current,
          { content: next, selStart: caret, selEnd: caret },
          setContent,
        );
      } else if (strum) {
        const r = insertSnippet(
          current,
          textarea.selectionStart,
          textarea.selectionStart,
          {
            before: `{strum: ${strum}}`,
            placeholder: "",
            after: "",
            line: true,
          },
        );
        applyEdit(textarea, current, { ...r, selStart: r.selEnd }, setContent);
      }
    });
  };

  const SAVE_UI: Record<SaveState, { icon: ReactNode; label: string; cls: string }> = {
    saved: {
      icon: <Check size={14} strokeWidth={2.5} />,
      label: t("saved"),
      cls: "text-accent",
    },
    dirty: {
      icon: <CloudUpload size={14} strokeWidth={2} />,
      label: t("unsaved"),
      cls: "text-sub",
    },
    saving: {
      icon: <CloudUpload size={14} strokeWidth={2} />,
      label: t("saving"),
      cls: "text-sub",
    },
    error: {
      icon: <TriangleAlert size={14} strokeWidth={2} />,
      label:
        autosave.error === "content"
          ? t("saveErrorTooLong")
          : autosave.error === "missing"
            ? t("saveErrorMissing")
            : t("saveError"),
      cls: "text-warn",
    },
  };
  const save = SAVE_UI[saveState];

  return (
    <div>
      {/* SUB-TOGGLE + ACCIONES */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-[11px] border border-edge bg-surface-3 p-1 text-[13px] font-semibold">
          {(
            [
              ["text", t("textMode"), <Code key="i" size={15} strokeWidth={2} />],
              ["visual", t("visualMode"), <Pencil key="i" size={15} strokeWidth={2} />],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSubMode(value)}
              aria-pressed={subMode === value}
              className={
                subMode === value
                  ? "yk-gradient flex cursor-pointer items-center gap-[7px] rounded-[9px] px-4 py-2"
                  : "flex cursor-pointer items-center gap-[7px] rounded-[9px] px-4 py-2 text-sub"
              }
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {content.length >= COUNTER_FROM && (
            <span
              className={`text-[12px] font-semibold tabular-nums ${tooLong ? "text-warn" : "text-tert"}`}
            >
              {t("charCount", { count: content.length, max: MAX_CONTENT_LENGTH })}
            </span>
          )}
          <span
            role="status"
            className={`inline-flex items-center gap-[7px] text-[12.5px] font-semibold ${save.cls}`}
          >
            {save.icon}
            {save.label}
          </span>
          {saveState === "error" && autosave.error !== "content" && (
            <button
              type="button"
              onClick={autosave.retry}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-warn/40 px-3 py-[7px] text-[12.5px] font-semibold text-warn hover:bg-warn/10"
            >
              <RotateCcw size={13} strokeWidth={2.2} />
              {t("retry")}
            </button>
          )}
          <Button
            size="sm"
            variant="accentSoft"
            onClick={() => setPasteOpen(true)}
            disabled={offline}
            title={offlineTitle}
          >
            <ClipboardPaste size={15} strokeWidth={2} />
            {t("paste.button")}
          </Button>
          <Button
            size="sm"
            onClick={() => setMetaOpen(true)}
            disabled={offline}
            title={offlineTitle}
          >
            <Settings size={15} strokeWidth={2} />
            {t("songData")}
          </Button>
        </div>
      </div>

      {/* ACORDES DE LA CANCIÓN: los que no tienen diagrama se crean aquí */}
      <div inert={offline}>
        <SongChordsStrip
          names={chordNames}
          chords={known}
          checked={checked}
          onCreate={setBuilderFor}
        />
      </div>

      {/* MODO TEXTO: editor + preview, cada panel con su propio scroll y cabecera fija;
          lado a lado, el botón del centro vincula ambos scrolls */}
      {subMode === "text" && (
        <div className="relative grid items-stretch gap-4 lg:h-[calc(100dvh-160px)] lg:min-h-[480px] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-x-12">
          <div className="flex h-[65dvh] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-edge bg-surface-3 lg:h-auto lg:min-h-0">
            <div className="flex shrink-0 items-center justify-between border-b border-edge px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
                ChordPro
              </span>
              {offline ? (
                <span className="text-[11px] font-semibold text-warn">
                  {tOffline("unavailable")}
                </span>
              ) : (
                <ChordproInsert
                  onInsert={insert}
                  onChord={(x, y) => setTextChord({ x, y })}
                  onStrum={openTextStrum}
                />
              )}
            </div>
            <div className="relative min-h-0 flex-1">
              <pre
                ref={highlightRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-[18px] py-4 font-mono text-[13.5px] leading-[1.85] text-ink"
              >
                {content.split("\n").map((line, i) => highlightLine(line, i))}
              </pre>
              <textarea
                ref={textareaRef}
                value={content}
                readOnly={offline}
                onChange={(e) => setContent(e.target.value)}
                onScroll={(e) => {
                  if (highlightRef.current) {
                    highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                    highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
                  if (scrollLinked) linked.onTextScroll();
                }}
                spellCheck={false}
                aria-label="ChordPro"
                className="absolute inset-0 resize-none overflow-auto overscroll-contain whitespace-pre bg-transparent px-[18px] py-4 font-mono text-[13.5px] leading-[1.85] text-transparent caret-[var(--ink)] outline-none"
              />
            </div>
          </div>

          <div className="flex h-[65dvh] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-edge bg-surface lg:h-auto lg:min-h-0">
            <div className="flex shrink-0 items-center gap-2 border-b border-edge px-4 py-3">
              <Eye size={14} strokeWidth={2} className="text-accent" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
                {t("preview")}
              </span>
            </div>
            <div
              ref={previewRef}
              onScroll={scrollLinked ? linked.onPreviewScroll : undefined}
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-[22px]"
            >
              {parsed.sections.length ? (
                <ChordSheet
                  sections={parsed.sections}
                  chords={known}
                  showLegend={false}
                  showFab={false}
                />
              ) : (
                <p className="text-sm text-tert">{t("previewEmpty")}</p>
              )}
            </div>
          </div>

          {/* Vincular scroll: un "puente" en acento une ambos paneles cuando está activo */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden w-12 -translate-x-1/2 -translate-y-1/2 items-center lg:flex">
            <span
              className={`h-0.5 flex-1 bg-accent/60 transition-opacity duration-200 motion-reduce:transition-none ${
                scrollLinked ? "opacity-100" : "opacity-0"
              }`}
            />
            <button
              type="button"
              onClick={toggleScrollLink}
              aria-pressed={scrollLinked}
              aria-label={t("scrollLink")}
              title={t(scrollLinked ? "scrollLinkedHint" : "scrollUnlinkedHint")}
              className={`pointer-events-auto grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border transition-[color,background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none ${
                scrollLinked
                  ? "border-accent/50 bg-accent/15 text-accent shadow-glow hover:border-accent"
                  : "border-edge-2 bg-surface-2 text-mute hover:border-accent hover:text-accent"
              }`}
            >
              {scrollLinked ? (
                <Link2 size={15} strokeWidth={2.2} />
              ) : (
                <Unlink2 size={15} strokeWidth={2.2} />
              )}
            </button>
            <span
              className={`h-0.5 flex-1 bg-accent/60 transition-opacity duration-200 motion-reduce:transition-none ${
                scrollLinked ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        </div>
      )}

      {/* MODO VISUAL */}
      {subMode === "visual" && (
        <div inert={offline}>
          <VisualEditor
            sections={visualModel}
            sectionTitle={sectionTitle}
            onPick={setPicker}
            onStrum={(headerLineIndex, strum) =>
              setStrumTarget({ headerLineIndex, strum, text: false })
            }
          />
        </div>
      )}

      {/* PICKER DE ACORDES */}
      {picker && (
        <ChordPicker
          instrument={instrument}
          x={picker.x}
          y={picker.y}
          currentChord={picker.token ? picker.token.chord : picker.unit.chord}
          customChords={myChords}
          onPick={applyChord}
          onRemove={() => applyChord(null)}
          onClose={() => setPicker(null)}
        />
      )}

      {/* PICKER DEL MODO TEXTO: inserta [acorde] en el cursor */}
      {textChord && (
        <ChordPicker
          instrument={instrument}
          x={textChord.x}
          y={textChord.y}
          currentChord={null}
          customChords={myChords}
          onPick={(chord) => {
            setTextChord(null);
            afterModal(() =>
              insert({ before: `[${chord}]`, placeholder: "", after: "", line: false }),
            );
          }}
          onRemove={() => setTextChord(null)}
          onClose={() => setTextChord(null)}
        />
      )}

      {/* CONSTRUCTOR DE UN ACORDE PROPIO ("Sin diagrama · Crear") */}
      {builderFor !== null && (
        <ChordBuilder
          instrument={instrument}
          initial={myChords.find((c) => c.name === builderFor) ?? { name: builderFor }}
          onClose={() => setBuilderFor(null)}
          onSaved={(chord) => {
            setMyChords((prev) => [...prev.filter((c) => c.id !== chord.id), chord]);
            setKnown((prev) => ({ ...prev, [chord.name]: customChordData(chord) }));
            setBuilderFor(null);
          }}
        />
      )}

      {/* SELECTOR DE RASGUEO */}
      {strumTarget && (
        <StrumBuilder
          initial={strumTarget.strum}
          onClose={() => setStrumTarget(null)}
          onSave={saveStrum}
        />
      )}

      {/* DRAWER DE METADATOS */}
      {metaOpen && (
        <SongMetaDrawer
          song={song}
          content={content}
          playlists={playlists}
          onClose={() => setMetaOpen(false)}
          onDelete={() => {
            // Con «Deshacer» en la lista: lo pendiente se guarda al salir.
            setMetaOpen(false);
            deleteLater(song);
            router.push(`/${instrument}/songs`);
          }}
        />
      )}

      {/* PEGAR CIFRADO */}
      {pasteOpen && (
        <PasteChordsModal
          onClose={() => setPasteOpen(false)}
          onInsert={(chordPro) => {
            // Canción vacía: reemplaza; si ya hay letra, se agrega al final.
            setContent((prev) =>
              prev.trim() ? `${prev.trimEnd()}\n\n${chordPro}` : chordPro,
            );
            setPasteOpen(false);
          }}
        />
      )}
    </div>
  );
}
