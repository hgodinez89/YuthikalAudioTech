"use client";

import {
  Check,
  ClipboardPaste,
  CloudUpload,
  Code,
  Eye,
  Info,
  Pencil,
  Settings,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { ChordPicker } from "./chord-picker";
import { ChordSheet, RepeatBadge, SheetNote } from "./chord-sheet";
import { ConfirmDialog } from "./confirm-dialog";
import { FIELD_CLASS } from "./playlist-form-modal";
import { chordsOverLyricsToChordPro } from "@/lib/chord-import";
import {
  arrowsToStrum,
  buildVisualModel,
  parseChordPro,
  parseInstrumentalLine,
  replaceInstrumentalToken,
  sectionHeaderLabel,
  setChordAtUnit,
  setSectionStrum,
  strumToArrows,
  type InstrumentalToken,
  type LyricUnit,
  type SectionType,
} from "@/lib/chordpro";
import type { Instrument } from "@/lib/instruments";
import { deleteSong, updateSongContent, updateSongMeta } from "@/lib/song-actions";
import { KEY_OPTIONS, keyLabel, validateSong, type SongRow } from "@/lib/songs";

type SaveState = "saved" | "dirty" | "saving" | "error";

/* ---------- resaltado de sintaxis del modo texto ---------- */

function highlightLine(line: string, key: number): ReactNode {
  // [[Sección]]: encabezado (azul de directivas, en negrita)
  if (sectionHeaderLabel(line)) {
    return (
      <span key={key} className="font-bold text-[#5b8cff]">
        {line}
        {"\n"}
      </span>
    );
  }
  // {c: …}: nota para el músico (tenue, cursiva)
  if (/^\s*\{\s*(c|comment|ci|comment_italic)\s*:/i.test(line)) {
    return (
      <span key={key} className="italic text-tert">
        {line}
        {"\n"}
      </span>
    );
  }
  // Línea instrumental ("Em D Bm C x2"): acordes en cian, compás/repetición tenues
  const instrumental = parseInstrumentalLine(line);
  if (instrumental) {
    let cursor = 0;
    return (
      <span key={key}>
        {instrumental.tokens.map((tk, i) => {
          const gap = line.slice(cursor, tk.start);
          cursor = tk.end;
          return (
            <Fragment key={i}>
              {gap}
              <span
                className={
                  tk.kind === "chord" ? "font-semibold text-accent" : "text-mute"
                }
              >
                {line.slice(tk.start, tk.end)}
              </span>
            </Fragment>
          );
        })}
        {line.slice(cursor)}
        {"\n"}
      </span>
    );
  }
  if (/^\s*\{[^}]*\}\s*$/.test(line)) {
    return (
      <span key={key} className="text-[#5b8cff]">
        {line}
        {"\n"}
      </span>
    );
  }
  const parts = line.split(/(\[[^\]]*\])/g);
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <span key={i} className="font-semibold text-accent">
            {part}
          </span>
        ) : (
          part
        ),
      )}
      {"\n"}
    </span>
  );
}

/* ---------- selector de rasgueo del modo visual ---------- */

function StrumBuilder({
  initial,
  onSave,
  onClose,
}: {
  initial: string | null;
  onSave: (strum: string | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations("editor");
  const [tokens, setTokens] = useState<string[]>(
    initial ? strumToArrows(initial).split(" ") : [],
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-page/55 backdrop-blur-[3px]"
      role="dialog"
      aria-label={t("strumTitle")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-edge-2 bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <h3 className="mb-3 text-[15px] font-extrabold">{t("strumTitle")}</h3>
        <div className="mb-4 flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-edge bg-surface-2 px-3 py-2 text-lg tracking-[0.1em] text-accent">
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
            className="grid h-11 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 px-3 text-sm font-semibold text-sub hover:border-accent"
          >
            ⌫
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave(null)}
            className="cursor-pointer rounded-[10px] border border-edge-2 bg-surface-2 px-3.5 py-2.5 text-[13px] font-semibold text-warn"
          >
            {t("strumRemove")}
          </button>
          <button
            type="button"
            onClick={() => onSave(tokens.length ? arrowsToStrum(tokens.join(" ")) : null)}
            className="yk-gradient cursor-pointer rounded-[10px] px-4 py-2.5 text-[13px] font-bold"
          >
            {t("strumSave")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- editor principal ---------- */

export type PlaylistOption = { id: string; name: string };

type InstrumentalChord = Extract<InstrumentalToken, { kind: "chord" }>;

/** Lo que edita el selector: una palabra de letra o un acorde de una línea instrumental. */
type PickerTarget = { lineIndex: number; x: number; y: number } & (
  { unit: LyricUnit; token?: undefined } | { token: InstrumentalChord; unit?: undefined }
);

/* ---------- pegar cifrado (acordes encima de la letra) ---------- */

function PasteChordsModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (chordPro: string) => void;
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const [raw, setRaw] = useState("");
  const converted = useMemo(() => chordsOverLyricsToChordPro(raw), [raw]);
  const preview = useMemo(() => parseChordPro(converted), [converted]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-page/70 p-4 backdrop-blur-[6px] sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-[20px] border border-edge-2 bg-surface shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-edge px-6 py-[18px]">
          <div>
            <h2 className="text-[19px] font-extrabold">{t("paste.title")}</h2>
            <p className="mt-0.5 text-[13px] text-tert">{t("paste.hint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tSongs("close")}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <textarea
            autoFocus
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
        <div className="flex justify-end gap-2.5 border-t border-edge px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-[11px] border border-edge-2 bg-surface-2 px-[18px] py-[11px] text-sm font-semibold"
          >
            {tSongs("cancel")}
          </button>
          <button
            type="button"
            disabled={!converted}
            onClick={() => onInsert(converted)}
            className="yk-gradient cursor-pointer rounded-[11px] px-5 py-[11px] text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("paste.insert")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SongEditor({
  song,
  instrument,
  playlists,
}: {
  song: SongRow;
  instrument: Instrument;
  playlists: PlaylistOption[];
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const tSongView = useTranslations("songView");
  const router = useRouter();

  const [content, setContent] = useState(song.content);
  const [subMode, setSubMode] = useState<"text" | "visual">("text");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [metaOpen, setMetaOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [strumTarget, setStrumTarget] = useState<{
    headerLineIndex: number;
    strum: string | null;
  } | null>(null);

  const highlightRef = useRef<HTMLPreElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  /* Autosave con debounce; el estado se refleja en la barra del editor. */
  useEffect(() => {
    if (content === song.content && saveState === "saved") return;
    setSaveState("dirty");
    const timer = setTimeout(async () => {
      setSaveState("saving");
      const result = await updateSongContent(song.id, contentRef.current);
      setSaveState(result.ok ? "saved" : "error");
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, song.id]);

  const parsed = useMemo(() => parseChordPro(content), [content]);
  const visualModel = useMemo(
    () => (subMode === "visual" ? buildVisualModel(content) : []),
    [subMode, content],
  );

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

  const sectionTitle = (type: SectionType, number: number, label: string | null) => {
    if (label) return label;
    if (type === "plain") return null;
    const base = tSongView(type);
    if (type === "verse") return `${base} ${number}`;
    return number > 1 ? `${base} ${number}` : base;
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
      label: t("saveError"),
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
          <span
            className={`inline-flex items-center gap-[7px] text-[12.5px] font-semibold ${save.cls}`}
          >
            {save.icon}
            {save.label}
          </span>
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-accent/40 bg-accent/10 px-[15px] py-[9px] text-[13px] font-semibold text-accent"
          >
            <ClipboardPaste size={15} strokeWidth={2} />
            {t("paste.button")}
          </button>
          <button
            type="button"
            onClick={() => setMetaOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-edge-2 bg-surface-2 px-[15px] py-[9px] text-[13px] font-semibold"
          >
            <Settings size={15} strokeWidth={2} />
            {t("songData")}
          </button>
        </div>
      </div>

      {/* MODO TEXTO: editor + preview, cada panel con su propio scroll y cabecera fija */}
      {subMode === "text" && (
        <div className="grid items-stretch gap-4 lg:h-[calc(100dvh-160px)] lg:min-h-[480px] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
          <div className="flex h-[65dvh] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-edge bg-surface-3 lg:h-auto lg:min-h-0 dark:bg-[#0b0d12]">
            <div className="flex shrink-0 items-center justify-between border-b border-edge px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-tert">
                ChordPro
              </span>
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] text-mute">
                <span className="inline-flex items-center gap-[5px]">
                  <span className="size-[9px] rounded-[2px] bg-accent" />[
                  {t("legendChord")}]
                </span>
                <span className="inline-flex items-center gap-[5px]">
                  <span className="size-[9px] rounded-[2px] bg-[#5b8cff]" />
                  {"{"}
                  {t("legendDirective")}
                  {"}"}
                </span>
                <span className="inline-flex items-center gap-[5px] font-bold">
                  <span className="size-[9px] rounded-[2px] bg-[#5b8cff]" />
                  [[{t("legendSection")}]]
                </span>
                <span className="inline-flex items-center gap-[5px] italic">
                  <span className="size-[9px] rounded-[2px] bg-tert" />
                  {"{c: "}
                  {t("legendNote")}
                  {"}"}
                </span>
              </div>
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
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={(e) => {
                  if (highlightRef.current) {
                    highlightRef.current.scrollTop = e.currentTarget.scrollTop;
                    highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
                  }
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
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-[22px]">
              {parsed.sections.length ? (
                <ChordSheet
                  sections={parsed.sections}
                  chords={{}}
                  showLegend={false}
                  showFab={false}
                />
              ) : (
                <p className="text-sm text-tert">{t("previewEmpty")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODO VISUAL */}
      {subMode === "visual" && (
        <div className="mx-auto max-w-[720px]">
          <div className="rounded-2xl border border-edge bg-surface px-7 py-[26px]">
            <div className="mb-[18px] flex items-center gap-2.5 rounded-[10px] border border-accent/20 bg-accent/[0.06] px-3 py-[9px] text-[12.5px] text-sub">
              <Info size={15} strokeWidth={2} className="shrink-0 text-accent" />
              {t("visualHint")}
            </div>

            {visualModel.length === 0 && (
              <p className="py-6 text-center text-sm text-tert">{t("visualEmpty")}</p>
            )}

            {visualModel.map((section, si) => {
              const title = sectionTitle(section.type, section.number, section.label);
              return (
                <section key={si} className="mb-7">
                  {(title || section.headerLineIndex !== null) && (
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      {title && (
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                          {title}
                        </span>
                      )}
                      {section.headerLineIndex !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            setStrumTarget({
                              headerLineIndex: section.headerLineIndex!,
                              strum: section.strum,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-edge bg-surface-2 px-[11px] py-1 text-xs text-sub hover:border-accent"
                        >
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-mute">
                            {tSongView("strum")}
                          </span>
                          <span className="tracking-[0.14em]">
                            {section.strum ? strumToArrows(section.strum) : t("strumAdd")}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                  {/* Mismo ritmo que la vista previa (ChordSheet), pero clicable */}
                  <div className="text-lg leading-[1.9]">
                    {section.lines.map((line) => (
                      <Fragment key={line.lineIndex}>
                        {line.gapBefore && <div className="h-[1.2em]" />}
                        {line.notesBefore.map((note, ni) => (
                          <SheetNote key={ni} text={note} />
                        ))}
                        {line.instrumental ? (
                          /* Solo acordes: cada acorde clicable; compás y ×N fijos */
                          <div className="mb-1 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                            {line.instrumental.tokens.map((tk, ti) =>
                              tk.kind === "bar" ? (
                                <span key={ti} className="font-light text-edge-2">
                                  |
                                </span>
                              ) : tk.kind === "repeat" ? (
                                <RepeatBadge key={ti} times={tk.times} />
                              ) : (
                                <button
                                  key={ti}
                                  type="button"
                                  onClick={(e) => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setPicker({
                                      lineIndex: line.lineIndex,
                                      token: tk,
                                      x: r.left + r.width / 2,
                                      y: r.bottom + 8,
                                    });
                                  }}
                                  className="cursor-pointer font-extrabold text-accent underline decoration-edge-2 decoration-dotted underline-offset-4 hover:decoration-accent"
                                >
                                  {tk.chord}
                                </button>
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="mb-1 flex flex-wrap items-end">
                            {line.units.map((unit, ui) => (
                              <span
                                key={ui}
                                className={`inline-flex flex-col whitespace-pre ${
                                  unit.spaceAfter ? "mr-[0.3em]" : ""
                                }`}
                              >
                                <span className="min-h-[22px] text-sm font-extrabold leading-relaxed tracking-[0.01em] text-accent">
                                  {unit.chord ?? ""}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setPicker({
                                      lineIndex: line.lineIndex,
                                      unit,
                                      x: r.left + r.width / 2,
                                      y: r.bottom + 8,
                                    });
                                  }}
                                  aria-label={unit.text || unit.chord || undefined}
                                  className="min-w-[1.1em] cursor-pointer text-left underline decoration-edge-2 decoration-dotted underline-offset-4 hover:decoration-accent"
                                >
                                  {/* acorde sin palabra: espacio clicable sin glifo */}
                                  {unit.text || " "}
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </Fragment>
                    ))}
                    {section.trailingNotes.map((note, ni) => (
                      <SheetNote key={ni} text={note} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* PICKER DE ACORDES */}
      {picker && (
        <ChordPicker
          instrument={instrument}
          x={picker.x}
          y={picker.y}
          currentChord={picker.token ? picker.token.chord : picker.unit.chord}
          onPick={applyChord}
          onRemove={() => applyChord(null)}
          onClose={() => setPicker(null)}
        />
      )}

      {/* SELECTOR DE RASGUEO */}
      {strumTarget && (
        <StrumBuilder
          initial={strumTarget.strum}
          onClose={() => setStrumTarget(null)}
          onSave={(strum) => {
            setContent(setSectionStrum(content, strumTarget.headerLineIndex, strum));
            setStrumTarget(null);
          }}
        />
      )}

      {/* DRAWER DE METADATOS */}
      {metaOpen && (
        <MetaDrawer
          song={song}
          playlists={playlists}
          onClose={() => setMetaOpen(false)}
          onDelete={() => {
            setMetaOpen(false);
            setDeleteOpen(true);
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

      {/* CONFIRMAR ELIMINAR CANCIÓN */}
      <DeleteSongDialog
        open={deleteOpen}
        song={song}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );

  function DeleteSongDialog({
    open,
    song,
    onCancel,
  }: {
    open: boolean;
    song: SongRow;
    onCancel: () => void;
  }) {
    const [pending, startTransition] = useTransition();
    return (
      <ConfirmDialog
        open={open}
        title={t("deleteTitle")}
        message={t.rich("deleteMessage", {
          name: song.name,
          b: (chunks) => <span className="font-bold text-ink">{chunks}</span>,
        })}
        cancelLabel={tSongs("cancel")}
        confirmLabel={pending ? t("deleting") : t("deleteConfirm")}
        confirmIcon={<Trash2 size={15} strokeWidth={2.2} />}
        pending={pending}
        onCancel={onCancel}
        onConfirm={() =>
          startTransition(async () => {
            await deleteSong(song.id);
            router.push(`/${instrument}/songs`);
          })
        }
      />
    );
  }
}

/* ---------- drawer "Datos de la canción" ---------- */

function MetaDrawer({
  song,
  playlists,
  onClose,
  onDelete,
}: {
  song: SongRow;
  playlists: PlaylistOption[];
  onClose: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("editor");
  const tSongs = useTranslations("songs");
  const router = useRouter();
  const [form, setForm] = useState({
    name: song.name,
    description: song.description,
    keyNote: song.key_note,
    playlistId: song.playlist_id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const input = { ...form, playlistId: form.playlistId || null };
    const invalid = validateSong(input);
    if (invalid) {
      setError(tSongs(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateSongMeta(song.id, input);
      if (!result.ok) {
        setError(tSongs(`errors.${result.error}`));
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex justify-end bg-page/70 backdrop-blur-[6px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-[420px] max-w-[92vw] overflow-y-auto border-l border-edge-2 bg-surface shadow-[-20px_0_60px_rgba(0,0,0,0.5)]"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-edge bg-surface px-6 py-[22px]">
          <h2 className="text-lg font-extrabold">{t("songData")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tSongs("close")}
            className="grid size-8 cursor-pointer place-items-center rounded-[9px] border border-edge bg-surface-2 text-sub"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex flex-col gap-5 p-6">
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {tSongs("form.name")}
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={150}
              className={`${FIELD_CLASS} h-11`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {tSongs("form.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={300}
              className={`${FIELD_CLASS} resize-none py-[11px]`}
            />
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {tSongs("form.key")}
            </label>
            <select
              value={form.keyNote}
              onChange={(e) => setForm({ ...form, keyNote: e.target.value })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              <option value="">{tSongs("form.noKey")}</option>
              {KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {keyLabel(k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-[7px] block text-[12.5px] font-semibold text-sub">
              {tSongs("form.playlist")}
            </label>
            <select
              value={form.playlistId}
              onChange={(e) => setForm({ ...form, playlistId: e.target.value })}
              className={`${FIELD_CLASS} h-11 cursor-pointer`}
            >
              <option value="">{tSongs("form.noPlaylist")}</option>
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-[13px] font-semibold text-warn">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="yk-gradient mt-1.5 cursor-pointer rounded-[11px] px-4 py-3 text-sm font-bold disabled:opacity-60"
          >
            {pending ? t("savingChanges") : t("saveChanges")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-warn/30 bg-warn/10 px-4 py-3 text-sm font-bold text-warn"
          >
            <Trash2 size={15} strokeWidth={2.2} />
            {t("deleteSong")}
          </button>
        </div>
      </div>
    </div>
  );
}
