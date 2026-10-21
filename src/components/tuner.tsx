"use client";

import { Check, ChevronDown, Mic, Volume2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, MenuItem } from "./menu";
import { noteName, octaveOf } from "@/lib/piano";
import { centsOff, nearestString, noteFromFreq } from "@/lib/pitch";
import {
  findTuning,
  MAX_TRANSPOSE,
  TUNER_TUNINGS,
  tuningStrings,
  type TuningId,
} from "@/lib/tunings";
import { usePianoSynth } from "@/lib/use-piano-synth";
import { usePitch } from "@/lib/use-pitch";
import { useStoredFlag, useStoredValue } from "@/lib/use-stored-flag";

type Fretted = "guitar" | "ukulele";
type View = "headstock" | "needle";

/* Afinada: dentro de ±5 cents durante medio segundo. */
const IN_TUNE = 5;
const HOLD_MS = 500;
/* Más lejos que esto, la burbuja dice cuántos semitonos faltan. */
const FAR = 50;
/* El tono de referencia suena y, mientras, no se escucha el micrófono. */
const REFERENCE_MS = 2200;
/* Aviso hablado para lectores de pantalla. */
const ANNOUNCE_EVERY = 1500;

const parseView = (raw: string): View | null =>
  raw === "headstock" || raw === "needle" ? raw : null;
const parseShift = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) && Math.abs(n) <= MAX_TRANSPOSE ? n : null;
};
const parseTuning = (raw: string) => raw || null;

/**
 * Afinador de Básicos (guitarra y ukelele): vista "Clavijero" (elegir la
 * cuerda o AUTO, burbujas de nota y desvío, trazo del historial) y vista
 * "Aguja" (cromático, ±50 cents). El micrófono solo se activa con el botón.
 */
export function Tuner({ instrument }: { instrument: Fretted }) {
  const t = useTranslations("tuner");
  const lang = useLocale() === "en" ? "en" : "es";
  const { playNote } = usePianoSynth();

  const [view, setView] = useStoredValue<View>(
    "yk-tuner-view",
    "headstock",
    parseView,
    String,
  );
  const [tuningId, setTuningId] = useStoredValue<string | null>(
    `yk-tuning:${instrument}`,
    null,
    parseTuning,
    (v) => v ?? "",
  );
  const [shift, setShift] = useStoredValue(
    `yk-tuning-shift:${instrument}`,
    0,
    parseShift,
    String,
  );
  const [auto, setAuto] = useStoredFlag("yk-tuner-auto", true);
  const tuning = findTuning(instrument, tuningId);
  const strings = tuningStrings(tuning, shift);
  const flats = shift < 0 || tuning.id === "halfDown";

  const [selected, setSelected] = useState(0);
  const [referenceUntil, setReferenceUntil] = useState(0);
  const pitch = usePitch(referenceUntil > 0);
  const listening = pitch.status === "listening";

  /* Cuerda objetivo: la detectada (AUTO) o la elegida. */
  const freq = pitch.freq;
  const detected = freq !== null ? nearestString(freq, strings) : null;
  const target = auto && detected !== null ? detected : selected;
  const targetMidi = strings[target];
  const cents = freq !== null ? centsOff(freq, targetMidi) : null;

  /* En AUTO, la cuerda detectada queda como la elegida al apagar AUTO. */
  const [lastDetected, setLastDetected] = useState<number | null>(null);
  if (auto && detected !== null && detected !== lastDetected) {
    setLastDetected(detected);
    setSelected(detected);
  }

  /* Cuerdas afinadas (✓): ±5 cents durante medio segundo. Se reinicia al
     cambiar de afinación. */
  const [tuned, setTuned] = useState<ReadonlySet<number>>(new Set());
  const [glow, setGlow] = useState<number | null>(null);
  const tuningKey = `${tuning.id}:${shift}`;
  const [lastTuningKey, setLastTuningKey] = useState(tuningKey);
  if (tuningKey !== lastTuningKey) {
    setLastTuningKey(tuningKey);
    setTuned(new Set());
  }
  const holdSince = useRef<{ string: number; since: number } | null>(null);
  const live = useRef({ target, targetMidi, tuned });
  useLayoutEffect(() => {
    live.current = { target, targetMidi, tuned };
  });
  useEffect(
    () =>
      pitch.subscribe((value) => {
        const { target: string, targetMidi: midi, tuned: done } = live.current;
        const c = value !== null ? centsOff(value, midi) : null;
        if (c === null || Math.abs(c) > IN_TUNE) {
          holdSince.current = null;
          return;
        }
        const now = performance.now();
        if (!holdSince.current || holdSince.current.string !== string) {
          holdSince.current = { string, since: now };
        } else if (now - holdSince.current.since >= HOLD_MS && !done.has(string)) {
          setTuned((prev) => new Set(prev).add(string));
          setGlow(string);
          setTimeout(() => setGlow((g) => (g === string ? null : g)), 1000);
        }
      }),
    [pitch],
  );

  /* Tono de referencia: suena la cuerda objetivo y el micrófono descansa. */
  const playReference = () => {
    playNote(targetMidi, 0, REFERENCE_MS / 1000);
    setReferenceUntil(Date.now() + REFERENCE_MS);
  };
  useEffect(() => {
    if (!referenceUntil) return;
    const timer = setTimeout(() => setReferenceUntil(0), referenceUntil - Date.now());
    return () => clearTimeout(timer);
  }, [referenceUntil]);

  const name = (midi: number) => noteName(midi, lang, flats);
  const fullName = (midi: number) => `${name(midi)}${octaveOf(midi)}`;
  const advice =
    cents === null
      ? null
      : Math.abs(cents) <= IN_TUNE
        ? t("inTune")
        : cents > 0
          ? t("loosen")
          : t("tighten");

  /* Aviso hablado cada ~1,5 s: "Mi2, 21 cents alto, afloja". */
  const [announce, setAnnounce] = useState("");
  const spokenText =
    listening && cents !== null && advice
      ? t("announce", {
          note: fullName(targetMidi),
          cents: Math.round(Math.abs(cents)),
          dir: cents > 0 ? "sharp" : "flat",
          advice: advice.toLocaleLowerCase(),
        })
      : "";
  const spoken = useRef(spokenText);
  useLayoutEffect(() => {
    spoken.current = spokenText;
  });
  useEffect(() => {
    if (!listening) return;
    const interval = setInterval(() => setAnnounce(spoken.current), ANNOUNCE_EVERY);
    return () => clearInterval(interval);
  }, [listening]);

  const chooseString = (i: number) => {
    setAuto(false);
    setSelected(i);
  };

  return (
    <section aria-labelledby="tuner-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="tuner-title"
            className="mb-2 text-[28px] font-extrabold tracking-[-0.02em]"
          >
            {t("title")}
          </h2>
          <p className="max-w-[560px] leading-relaxed text-sub">{t("intro")}</p>
        </div>
        {/* Clavijero | Aguja (recordado) */}
        <div
          role="radiogroup"
          aria-label={t("view")}
          className="flex rounded-[11px] border border-edge bg-surface-3 p-1 text-[13px] font-semibold"
        >
          {(["headstock", "needle"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={
                view === v
                  ? "yk-gradient cursor-pointer rounded-[9px] px-4 py-2"
                  : "cursor-pointer rounded-[9px] px-4 py-2 text-sub hover:text-ink"
              }
            >
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="yk-stage overflow-hidden rounded-[20px] border border-edge shadow-card">
        {/* BARRA SUPERIOR: AUTO · afinación · ♭ / ♯ */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3">
          {view === "headstock" ? (
            <button
              type="button"
              role="switch"
              aria-checked={auto}
              onClick={() => setAuto(!auto)}
              title={t("autoHint")}
              className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-bold uppercase tracking-[0.1em] text-sub hover:text-ink"
            >
              {t("auto")}
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  auto ? "yk-gradient" : "border border-edge-2 bg-surface-3"
                }`}
              >
                <span
                  className={`absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-[left] ${
                    auto ? "left-[19px]" : "left-[2px]"
                  }`}
                />
              </span>
            </button>
          ) : (
            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-sub">
              {t("chromatic")}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShift(Math.max(-MAX_TRANSPOSE, shift - 1))}
              disabled={shift <= -MAX_TRANSPOSE}
              aria-label={t("shiftDown")}
              title={t("shiftDown")}
              className="yk-hit relative grid size-9 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-[17px] font-bold text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ♭
            </button>
            <Menu
              label={t("tuning")}
              trigger={{
                "aria-label": `${t("tuning")}: ${t(`tunings.${tuning.id}`)}`,
                className:
                  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-edge-2 bg-surface-2 px-3 text-[13px] font-semibold hover:border-accent/50",
                children: (
                  <>
                    {t(`tunings.${tuning.id}`)}
                    {shift !== 0 && (
                      <span className="text-accent">
                        {shift > 0 ? `♯${shift}` : `♭${-shift}`}
                      </span>
                    )}
                    <ChevronDown size={14} strokeWidth={2.2} className="text-tert" />
                  </>
                ),
              }}
              panelClassName="absolute right-0 top-[42px] z-40 w-[250px] rounded-[12px] border border-edge-2 bg-surface p-1.5 shadow-pop"
            >
              {TUNER_TUNINGS[instrument].map((option) => (
                <MenuItem
                  key={option.id}
                  checked={option.id === tuning.id}
                  onSelect={() => setTuningId(option.id as TuningId)}
                  className={`flex w-full flex-col items-start rounded-[9px] px-3 py-2 text-left ${
                    option.id === tuning.id ? "bg-accent/10" : ""
                  }`}
                >
                  <span className="text-[13.5px] font-semibold">
                    {t(`tunings.${option.id}`)}
                  </span>
                  <span className="text-[12px] text-tert">
                    {option.strings
                      .map((m) => noteName(m, lang, option.id === "halfDown"))
                      .join(" ")}
                  </span>
                </MenuItem>
              ))}
            </Menu>
            <button
              type="button"
              onClick={() => setShift(Math.min(MAX_TRANSPOSE, shift + 1))}
              disabled={shift >= MAX_TRANSPOSE}
              aria-label={t("shiftUp")}
              title={t("shiftUp")}
              className="yk-hit relative grid size-9 cursor-pointer place-items-center rounded-[10px] border border-edge-2 bg-surface-2 text-[17px] font-bold text-sub hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ♯
            </button>
          </div>
        </div>

        {/* MICRÓFONO APAGADO / SIN PERMISO */}
        {!listening ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <span className="grid size-16 place-items-center rounded-full border border-accent/30 bg-accent/10 text-accent">
              <Mic size={28} strokeWidth={2} />
            </span>
            <p className="max-w-[380px] text-[14.5px] leading-relaxed text-sub">
              {pitch.status === "denied"
                ? t("denied")
                : pitch.status === "unavailable"
                  ? t("unavailable")
                  : pitch.status === "error"
                    ? t("error")
                    : t("micIntro")}
            </p>
            <button
              type="button"
              onClick={() => void pitch.start()}
              disabled={pitch.status === "starting"}
              className="yk-gradient inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-6 text-[15px] font-bold disabled:cursor-wait disabled:opacity-70"
            >
              <Mic size={17} strokeWidth={2.2} />
              {pitch.status === "starting" ? t("starting") : t("enableMic")}
            </button>
          </div>
        ) : view === "headstock" ? (
          <HeadstockView
            instrument={instrument}
            strings={strings}
            target={target}
            detected={auto ? detected : null}
            cents={cents}
            advice={advice}
            tuned={tuned}
            glow={glow}
            name={name}
            fullName={fullName}
            subscribe={pitch.subscribe}
            onChoose={chooseString}
            onReference={playReference}
            referencePlaying={referenceUntil > 0}
          />
        ) : (
          <NeedleView freq={freq} strings={strings} name={name} lang={lang} />
        )}
      </div>

      {listening && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-tert">
          <span>{freq === null ? t("silence") : t("listening")}</span>
          <button
            type="button"
            onClick={pitch.stop}
            className="yk-hit-y relative cursor-pointer font-semibold text-sub hover:text-ink"
          >
            {t("stopMic")}
          </button>
        </div>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Vista 1 · Clavijero                                                      */
/* ---------------------------------------------------------------------- */

/* Geometría del clavijero (SVG 240 de ancho): postes de las clavijas por
   lado, de arriba abajo; la 6ª (o 4ª) va abajo a la izquierda. */
const HEAD = {
  guitar: { height: 300, posts: [96, 156, 216], nutY: 292, nutX: [78, 162] },
  ukulele: { height: 240, posts: [104, 176], nutY: 232, nutX: [92, 148] },
};
const POST_X = [62, 178];

function HeadstockView({
  instrument,
  strings,
  target,
  detected,
  cents,
  advice,
  tuned,
  glow,
  name,
  fullName,
  subscribe,
  onChoose,
  onReference,
  referencePlaying,
}: {
  instrument: Fretted;
  strings: number[];
  target: number;
  detected: number | null;
  cents: number | null;
  advice: string | null;
  tuned: ReadonlySet<number>;
  glow: number | null;
  name: (midi: number) => string;
  fullName: (midi: number) => string;
  subscribe: (listener: (freq: number | null) => void) => () => void;
  onChoose: (i: number) => void;
  onReference: () => void;
  referencePlaying: boolean;
}) {
  const t = useTranslations("tuner");
  const geo = HEAD[instrument];
  const half = strings.length / 2;
  const nutX = (i: number) =>
    geo.nutX[0] + ((geo.nutX[1] - geo.nutX[0]) * i) / (strings.length - 1);
  /* Lado y poste de cada cuerda: las graves a la izquierda (la más grave abajo). */
  const post = (i: number) =>
    i < half
      ? { side: 0, y: geo.posts[half - 1 - i] }
      : { side: 1, y: geo.posts[i - half] };
  const inTune = cents !== null && Math.abs(cents) <= IN_TUNE;
  const far = cents !== null && Math.abs(cents) > FAR;
  const semis = cents !== null ? Math.round(cents / 100) : 0;

  return (
    <div className="flex flex-col items-center gap-5 px-4 pb-6 pt-5">
      {/* BURBUJAS: nota objetivo (toca para escucharla) y desvío */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReference}
          aria-label={t("reference", { note: fullName(strings[target]) })}
          title={t("reference", { note: fullName(strings[target]) })}
          className={`flex min-h-[64px] min-w-[96px] cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 py-2 ${
            referencePlaying
              ? "border-accent bg-accent/10"
              : "border-edge-2 bg-surface hover:border-accent/50"
          }`}
        >
          <span className="text-[26px] font-extrabold leading-none">
            {name(strings[target])}
            <sub className="ml-0.5 text-[13px] font-bold text-tert">
              {strings[target] && octaveOf(strings[target])}
            </sub>
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-tert">
            <Volume2 size={12} strokeWidth={2} />
            {t("listen")}
          </span>
        </button>
        <div
          className={`flex min-h-[64px] min-w-[140px] flex-col items-center justify-center rounded-2xl border px-4 py-2 transition-colors ${
            cents === null
              ? "border-edge bg-surface-2 text-tert"
              : inTune
                ? "border-accent bg-accent/15 text-accent"
                : "border-warn/50 bg-warn/10 text-warn"
          }`}
        >
          <span className="text-[22px] font-extrabold leading-none tabular-nums">
            {cents === null
              ? "—"
              : far
                ? t("semitones", {
                    count: Math.abs(semis),
                    dir: semis > 0 ? "up" : "down",
                  })
                : `${cents > 0 ? "+" : ""}${Math.round(cents)}`}
          </span>
          <span className="mt-1 text-[12px] font-bold">
            {cents === null
              ? t("playString")
              : far
                ? semis > 0
                  ? t("loosen")
                  : t("tighten")
                : advice}
          </span>
        </div>
      </div>

      {/* TRAZO DEL HISTORIAL (baja con el tiempo) */}
      <HistoryTrace subscribe={subscribe} targetMidi={strings[target]} />

      {/* CLAVIJERO */}
      <div className="relative w-[340px] max-w-full" style={{ height: geo.height }}>
        <svg
          aria-hidden
          viewBox={`0 0 240 ${geo.height}`}
          width={240}
          height={geo.height}
          className="absolute left-1/2 top-0 -translate-x-1/2"
        >
          <defs>
            {/* En coordenadas del dibujo: una línea vertical no tiene ancho propio. */}
            <linearGradient
              id="yk-tuner-grad"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1={geo.nutY}
              x2="0"
              y2="0"
            >
              <stop offset="0" stopColor="var(--grad-from)" />
              <stop offset="1" stopColor="var(--grad-to)" />
            </linearGradient>
          </defs>
          {/* pala */}
          <path
            d={
              instrument === "guitar"
                ? `M70 ${geo.nutY} L40 70 Q40 18 120 14 Q200 18 200 70 L170 ${geo.nutY} Z`
                : `M84 ${geo.nutY} L56 78 Q56 22 120 18 Q184 22 184 78 L156 ${geo.nutY} Z`
            }
            fill="var(--neck-head)"
            stroke="var(--neck-edge)"
            strokeWidth={1.5}
          />
          {/* cejuela */}
          <rect
            x={geo.nutX[0] - 10}
            y={geo.nutY - 4}
            width={geo.nutX[1] - geo.nutX[0] + 20}
            height={6}
            rx={2}
            fill="var(--neck-nut)"
          />
          {/* cuerdas: de la cejuela a su poste */}
          {strings.map((_, i) => {
            const p = post(i);
            const on = i === target;
            return (
              <line
                key={i}
                x1={nutX(i)}
                y1={geo.nutY}
                x2={POST_X[p.side]}
                y2={p.y}
                stroke={on ? "url(#yk-tuner-grad)" : "var(--neck-string)"}
                strokeWidth={on ? 2.6 : 1.2 + (strings.length - i) * 0.15}
                opacity={on ? 1 : 0.7}
              />
            );
          })}
          {/* postes y clavijas */}
          {strings.map((_, i) => {
            const p = post(i);
            const x = POST_X[p.side];
            return (
              <g key={i}>
                <rect
                  x={p.side === 0 ? 8 : x}
                  y={p.y - 4}
                  width={p.side === 0 ? x - 8 : 232 - x}
                  height={8}
                  rx={3}
                  fill="var(--neck-edge)"
                />
                <circle
                  cx={x}
                  cy={p.y}
                  r={7}
                  fill="var(--neck-peg)"
                  stroke="var(--neck-peg-edge)"
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>
        {/* BOTONES DE CUERDA a los lados (tocar para elegirla) */}
        {strings.map((midi, i) => {
          const p = post(i);
          const on = i === target;
          const done = tuned.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(i)}
              aria-pressed={on}
              aria-label={t("chooseString", {
                note: fullName(midi),
                state: done ? t("tunedState") : "",
              })}
              className={`absolute grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full border text-[14px] font-extrabold transition-shadow ${
                on
                  ? "yk-gradient border-transparent"
                  : done
                    ? "border-accent/60 bg-surface text-accent"
                    : "border-edge-2 bg-surface text-ink hover:border-accent/50"
              } ${glow === i ? "shadow-glow" : ""} ${detected === i && !on ? "ring-2 ring-accent/40" : ""}`}
              style={{ top: p.y, [p.side === 0 ? "left" : "right"]: 0 }}
            >
              {name(midi)}
              {done && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-page">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Trazo del desvío en los últimos segundos: cian dentro de ±5 cents, ámbar fuera. */
function HistoryTrace({
  subscribe,
  targetMidi,
}: {
  subscribe: (listener: (freq: number | null) => void) => () => void;
  targetMidi: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(targetMidi);
  useLayoutEffect(() => {
    targetRef.current = targetMidi;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const points: (number | null)[] = [];
    const MAX = 90;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const style = getComputedStyle(canvas);
      const accent = style.getPropertyValue("--accent").trim();
      const warn = style.getPropertyValue("--warn").trim();
      const grid = style.getPropertyValue("--edge").trim();
      const x = (c: number) =>
        w / 2 + (Math.max(-FAR, Math.min(FAR, c)) / FAR) * (w / 2 - 6);
      // Rejilla tenue: centro, zona afinada y bordes.
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      for (const c of [-50, -25, 0, 25, 50]) {
        ctx.beginPath();
        ctx.moveTo(x(c), 0);
        ctx.lineTo(x(c), h);
        ctx.stroke();
      }
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(x(-IN_TUNE), 0, x(IN_TUNE) - x(-IN_TUNE), h);
      ctx.globalAlpha = 1;
      // La lectura más nueva arriba; las viejas bajan.
      const step = h / MAX;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      for (let i = 1; i < points.length; i++) {
        const a = points[points.length - i];
        const b = points[points.length - 1 - i];
        if (a === null || b === null || a === undefined || b === undefined) continue;
        ctx.strokeStyle = Math.abs(a) <= IN_TUNE ? accent : warn;
        ctx.globalAlpha = Math.max(0.15, 1 - i / MAX);
        ctx.beginPath();
        ctx.moveTo(x(a), (i - 1) * step + 4);
        ctx.lineTo(x(b), i * step + 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    return subscribe((freq) => {
      points.push(freq === null ? null : centsOff(freq, targetRef.current));
      if (points.length > MAX) points.shift();
      draw();
    });
  }, [subscribe]);

  return (
    <canvas ref={canvasRef} aria-hidden className="h-[110px] w-full max-w-[360px]" />
  );
}

/* ---------------------------------------------------------------------- */
/* Vista 2 · Aguja (cromático)                                              */
/* ---------------------------------------------------------------------- */

function NeedleView({
  freq,
  strings,
  name,
  lang,
}: {
  freq: number | null;
  strings: number[];
  name: (midi: number) => string;
  lang: "es" | "en";
}) {
  const t = useTranslations("tuner");
  const note = freq !== null ? noteFromFreq(freq) : null;
  const cents = note?.cents ?? 0;
  const inTune = note !== null && Math.abs(cents) <= IN_TUNE;
  /* Cuerda de la afinación que coincide con la nota (si alguna). */
  const string = note ? strings.findIndex((m) => m === note.midi) : -1;
  const angle = note ? Math.max(-FAR, Math.min(FAR, cents)) * 0.9 : 0;
  const other = lang === "es" ? "en" : "es";

  return (
    <div className="flex flex-col items-center gap-3 px-4 pb-8 pt-6">
      <svg
        aria-hidden
        viewBox="0 0 300 172"
        width={300}
        height={172}
        className="max-w-full"
      >
        <defs>
          <linearGradient
            id="yk-needle-grad"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="160"
            x2="0"
            y2="44"
          >
            <stop offset="0" stopColor="var(--grad-from)" />
            <stop offset="1" stopColor="var(--grad-to)" />
          </linearGradient>
        </defs>
        {/* arco y marcas cada 10 cents */}
        <path
          d="M20 160 A130 130 0 0 1 280 160"
          fill="none"
          stroke="var(--edge-2)"
          strokeWidth={2}
        />
        {Array.from({ length: 11 }, (_, i) => {
          const c = -50 + i * 10;
          const a = ((c * 0.9 - 90) * Math.PI) / 180;
          const r1 = c === 0 ? 108 : 116;
          return (
            <line
              key={c}
              x1={150 + Math.cos(a) * r1}
              y1={160 + Math.sin(a) * r1}
              x2={150 + Math.cos(a) * 128}
              y2={160 + Math.sin(a) * 128}
              stroke={c === 0 ? "var(--accent)" : "var(--edge-2)"}
              strokeWidth={c === 0 ? 3 : 2}
              strokeLinecap="round"
            />
          );
        })}
        {/* zona afinada ±5 */}
        <path
          d={`M${150 + Math.cos(((-4.5 - 90) * Math.PI) / 180) * 130} ${160 + Math.sin(((-4.5 - 90) * Math.PI) / 180) * 130} A130 130 0 0 1 ${150 + Math.cos(((4.5 - 90) * Math.PI) / 180) * 130} ${160 + Math.sin(((4.5 - 90) * Math.PI) / 180) * 130}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* aguja */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "150px 160px",
            transition: "transform 120ms ease-out",
          }}
          opacity={note ? 1 : 0.35}
        >
          <line
            x1={150}
            y1={160}
            x2={150}
            y2={44}
            stroke="url(#yk-needle-grad)"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
        <circle
          cx={150}
          cy={160}
          r={8}
          fill="var(--surface)"
          stroke="var(--accent)"
          strokeWidth={3}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span
          className={`text-[56px] font-extrabold leading-none ${inTune ? "text-accent" : note ? "text-ink" : "text-tert"}`}
        >
          {note ? name(note.midi) : "—"}
          {note && (
            <sub className="ml-1 text-[20px] font-bold text-tert">
              {octaveOf(note.midi)}
            </sub>
          )}
        </span>
        <span className="mt-1 text-[14px] font-semibold text-tert">
          {note ? `${noteName(note.midi, other)}${octaveOf(note.midi)}` : t("playString")}
        </span>
        <span
          className={`mt-2 text-[15px] font-bold tabular-nums ${inTune ? "text-accent" : "text-warn"}`}
        >
          {note ? `${cents > 0 ? "+" : ""}${Math.round(cents)} cents` : " "}
        </span>
        {string >= 0 && (
          <span className="mt-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[12px] font-bold text-accent">
            {t("matchesString", { n: strings.length - string })}
          </span>
        )}
      </div>
    </div>
  );
}
