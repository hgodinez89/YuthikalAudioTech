"use client";

import { Minus, Play, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { Button } from "./button";
import { ChordDiagram } from "./chord-diagram";
import { Modal, MODAL_PANEL, ModalFooter, ModalHeader } from "./modal";
import { PianoKeyboard } from "./piano-keyboard";
import { FIELD_CLASS } from "./playlist-form-modal";
import { saveCustomChord } from "@/lib/custom-chord-actions";
import {
  FRET_WINDOW,
  MAX_BASE_FRET,
  MAX_CHORD_NAME,
  PIANO_MAX_KEYS,
  soundingNotes,
  stringCount,
  validateCustomChord,
  type CustomChordInput,
  type CustomChordRow,
} from "@/lib/custom-chords";
import { isFretted, TUNINGS, type Instrument } from "@/lib/instruments";
import { usePianoSynth } from "@/lib/use-piano-synth";

/* Rejilla del constructor (px): igual en proporción al diagrama del catálogo. */
const COL = 40;
const ROW = 40;
const TOP = 34;

/**
 * Constructor de un acorde propio. Guitarra y ukelele: rejilla de cuerdas ×
 * 5 trastes (tocar sobre la cejuela alterna al aire / muteada), traste
 * inicial y cejilla de cuerda a cuerda; piano: teclas del teclado. La vista
 * previa es el mismo diagrama del catálogo y "Escuchar" lo hace sonar.
 */
export function ChordBuilder({
  instrument,
  initial,
  onClose,
  onSaved,
}: {
  instrument: Instrument;
  /** Acorde a editar, o solo el nombre para uno nuevo ("Sin diagrama · Crear"). */
  initial?: CustomChordRow | { name: string };
  onClose: () => void;
  onSaved: (chord: CustomChordRow) => void;
}) {
  const t = useTranslations("chordBuilder");
  const titleId = useId();
  const nameId = useId();
  const { playChord } = usePianoSynth();
  const editing = initial && "id" in initial ? initial : null;
  const fretted = isFretted(instrument);
  const strings = fretted ? stringCount(instrument) : 0;
  /* Cuerdas al aire de la más grave a la 1ª (como los trastes del diagrama). */
  const open = fretted ? TUNINGS[instrument].map((s) => s.midi).reverse() : [];

  const [name, setName] = useState(initial?.name ?? "");
  const [baseFret, setBaseFret] = useState(editing?.base_fret ?? 1);
  const [frets, setFrets] = useState<number[]>(
    editing?.frets.length ? editing.frets : Array.from({ length: strings }, () => 0),
  );
  const [barres, setBarres] = useState<number[]>(editing?.barres ?? []);
  const [keys, setKeys] = useState<number[]>(editing?.keys ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const input: CustomChordInput = { instrument, name, baseFret, frets, barres, keys };
  // Cejilla vigente solo si todavía pisa dos cuerdas (si no, se quita sola).
  const validBarres = barres.filter((b) => frets.filter((f) => f === b).length >= 2);

  const setString = (i: number, value: number) =>
    setFrets((prev) => prev.map((f, j) => (j === i ? value : f)));
  const tapNut = (i: number) => setString(i, frets[i] === 0 ? -1 : 0);
  const tapFret = (i: number, f: number) => setString(i, frets[i] === f ? 0 : f);

  /* Cejilla en un traste, de una cuerda a otra: esas cuerdas quedan pisadas
     ahí salvo las que ya pisan más arriba. */
  const [barreFret, setBarreFret] = useState(1);
  const [barreFrom, setBarreFrom] = useState(0);
  const [barreTo, setBarreTo] = useState(Math.max(strings - 1, 0));
  const addBarre = () => {
    const lo = Math.min(barreFrom, barreTo);
    const hi = Math.max(barreFrom, barreTo);
    if (hi === lo) return;
    setFrets((prev) =>
      prev.map((f, i) => (i >= lo && i <= hi && f < barreFret ? barreFret : f)),
    );
    setBarres((prev) => [...prev.filter((b) => b !== barreFret), barreFret].slice(-2));
  };

  const toggleKey = (midi: number) =>
    setKeys((prev) =>
      prev.includes(midi)
        ? prev.filter((k) => k !== midi)
        : prev.length < PIANO_MAX_KEYS
          ? [...prev, midi].sort((a, b) => a - b)
          : prev,
    );

  const listen = () => playChord(fretted ? soundingNotes(open, frets, baseFret) : keys);

  const save = () => {
    const payload = { ...input, barres: validBarres };
    const invalid = validateCustomChord(payload);
    if (invalid) {
      setError(t(`errors.${invalid}`));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveCustomChord(payload, editing?.id).catch(() => null);
      if (!result?.ok) {
        setError(t(`errors.${result?.error ?? "db"}`));
        return;
      }
      onSaved(result.chord);
    });
  };

  const stringLabel = (i: number) =>
    fretted ? TUNINGS[instrument][strings - 1 - i].noteEs : "";
  const smallButton =
    "yk-hit relative grid size-9 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <Modal onClose={onClose} labelledBy={titleId}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className={`${MODAL_PANEL} max-w-[640px]`}
      >
        <ModalHeader
          id={titleId}
          title={editing ? t("editTitle") : t("newTitle")}
          subtitle={t(`hint.${fretted ? "fretted" : "piano"}`)}
          closeLabel={t("close")}
          onClose={onClose}
        />
        <div className="flex flex-col gap-5 px-6 py-5">
          <div>
            <label
              htmlFor={nameId}
              className="mb-[7px] block text-[12.5px] font-semibold text-sub"
            >
              {t("name")}
            </label>
            <input
              id={nameId}
              data-autofocus={!initial?.name || undefined}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={MAX_CHORD_NAME}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={error ? `${nameId}-error` : undefined}
              className={`${FIELD_CLASS} h-11 font-bold`}
            />
          </div>

          {fretted ? (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
              {/* REJILLA: columnas = cuerdas (grave → aguda), filas = trastes */}
              <div>
                <div
                  role="group"
                  aria-label={t("grid")}
                  className="relative"
                  style={{ width: COL * strings, height: TOP + ROW * FRET_WINDOW }}
                >
                  {/* cuerdas, cejuela y trastes */}
                  <svg
                    aria-hidden
                    width={COL * strings}
                    height={TOP + ROW * FRET_WINDOW}
                    className="absolute inset-0"
                  >
                    {Array.from({ length: strings }, (_, i) => (
                      <line
                        key={i}
                        x1={COL * i + COL / 2}
                        x2={COL * i + COL / 2}
                        y1={TOP}
                        y2={TOP + ROW * FRET_WINDOW}
                        stroke="var(--diagram-grid)"
                        strokeWidth={1.5}
                      />
                    ))}
                    {Array.from({ length: FRET_WINDOW + 1 }, (_, f) => (
                      <line
                        key={f}
                        x1={COL / 2}
                        x2={COL * strings - COL / 2}
                        y1={TOP + ROW * f}
                        y2={TOP + ROW * f}
                        stroke={
                          f === 0 && baseFret === 1
                            ? "var(--diagram-nut)"
                            : "var(--diagram-grid)"
                        }
                        strokeWidth={f === 0 && baseFret === 1 ? 4 : 1.5}
                      />
                    ))}
                  </svg>
                  {frets.map((f, i) => (
                    <div key={i}>
                      {/* sobre la cejuela: al aire (○) o muteada (×) */}
                      <button
                        type="button"
                        onClick={() => tapNut(i)}
                        aria-label={t("nut", {
                          string: stringLabel(i),
                          state: f === -1 ? t("muted") : t("open"),
                        })}
                        className="absolute grid cursor-pointer place-items-center text-[15px] font-bold text-sub hover:text-ink"
                        style={{ left: COL * i, top: 0, width: COL, height: TOP }}
                      >
                        {f === -1 ? "×" : f === 0 ? "○" : ""}
                      </button>
                      {Array.from({ length: FRET_WINDOW }, (_, r) => {
                        const fret = r + 1;
                        const on = f === fret;
                        return (
                          <button
                            key={fret}
                            type="button"
                            onClick={() => tapFret(i, fret)}
                            aria-pressed={on}
                            aria-label={t("cell", {
                              string: stringLabel(i),
                              fret: baseFret - 1 + fret,
                            })}
                            className="group absolute grid cursor-pointer place-items-center"
                            style={{
                              left: COL * i,
                              top: TOP + ROW * r,
                              width: COL,
                              height: ROW,
                            }}
                          >
                            <span
                              className={`size-[22px] rounded-full ${
                                on
                                  ? validBarres.includes(fret)
                                    ? "bg-accent ring-2 ring-accent/30"
                                    : "bg-accent"
                                  : "bg-transparent group-hover:bg-accent/20"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex text-center text-[11px] font-bold text-tert">
                  {Array.from({ length: strings }, (_, i) => (
                    <span key={i} style={{ width: COL }}>
                      {stringLabel(i)}
                    </span>
                  ))}
                </div>
              </div>

              {/* CONTROLES Y VISTA PREVIA */}
              <div className="flex w-full flex-col gap-4 sm:w-[240px]">
                <div>
                  <span className="mb-[7px] block text-[12.5px] font-semibold text-sub">
                    {t("baseFret")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBaseFret((b) => Math.max(1, b - 1))}
                      disabled={baseFret <= 1}
                      aria-label={t("baseFretDown")}
                      className={smallButton}
                    >
                      <Minus size={15} strokeWidth={2.2} />
                    </button>
                    <span className="min-w-[42px] text-center text-[15px] font-bold tabular-nums">
                      {baseFret}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBaseFret((b) => Math.min(MAX_BASE_FRET, b + 1))}
                      disabled={baseFret >= MAX_BASE_FRET}
                      aria-label={t("baseFretUp")}
                      className={smallButton}
                    >
                      <Plus size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <fieldset className="rounded-xl border border-edge p-3">
                  <legend className="px-1 text-[12.5px] font-semibold text-sub">
                    {t("barre")}
                  </legend>
                  <div className="grid grid-cols-3 gap-1.5 text-[12px]">
                    <label className="flex flex-col gap-1 text-tert">
                      {t("barreFret")}
                      <select
                        value={barreFret}
                        onChange={(e) => setBarreFret(Number(e.target.value))}
                        className={`${FIELD_CLASS} h-9 !px-2 !text-[13px]`}
                      >
                        {Array.from({ length: FRET_WINDOW }, (_, r) => (
                          <option key={r} value={r + 1}>
                            {baseFret + r}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-tert">
                      {t("barreFrom")}
                      <select
                        value={barreFrom}
                        onChange={(e) => setBarreFrom(Number(e.target.value))}
                        className={`${FIELD_CLASS} h-9 !px-2 !text-[13px]`}
                      >
                        {frets.map((_, i) => (
                          <option key={i} value={i}>
                            {stringLabel(i)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-tert">
                      {t("barreTo")}
                      <select
                        value={barreTo}
                        onChange={(e) => setBarreTo(Number(e.target.value))}
                        className={`${FIELD_CLASS} h-9 !px-2 !text-[13px]`}
                      >
                        {frets.map((_, i) => (
                          <option key={i} value={i}>
                            {stringLabel(i)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Button size="sm" onClick={addBarre} className="flex-1">
                      {t("barreAdd")}
                    </Button>
                    {validBarres.length > 0 && (
                      <Button size="sm" onClick={() => setBarres([])}>
                        {t("barreClear")}
                      </Button>
                    )}
                  </div>
                </fieldset>

                <div className="flex flex-col items-center gap-3 rounded-xl border border-edge bg-surface-2 p-3">
                  <div className="flex flex-col items-center">
                    <ChordDiagram
                      frets={frets}
                      barres={validBarres}
                      baseFret={baseFret}
                    />
                    <span className="mt-1 max-w-[110px] truncate text-[13px] font-extrabold">
                      {name.trim() || "—"}
                    </span>
                  </div>
                  <Button size="sm" variant="accentSoft" onClick={listen}>
                    <Play size={13} fill="currentColor" strokeWidth={0} />
                    {t("listen")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="overflow-x-auto rounded-xl border border-edge bg-surface-2 p-3">
                <PianoKeyboard
                  start={48}
                  octaves={2}
                  pressed={keys}
                  labels="pressed"
                  onKey={toggleKey}
                  whiteWidth={30}
                  height={130}
                  className="mx-auto"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-tert">
                  {t("keysCount", { count: keys.length, max: PIANO_MAX_KEYS })}
                </span>
                <Button
                  size="sm"
                  variant="accentSoft"
                  onClick={listen}
                  disabled={!keys.length}
                >
                  <Play size={13} fill="currentColor" strokeWidth={0} />
                  {t("listen")}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p
              id={`${nameId}-error`}
              role="alert"
              className="text-[13px] font-semibold text-warn"
            >
              {error}
            </p>
          )}
        </div>
        <ModalFooter>
          <Button onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
