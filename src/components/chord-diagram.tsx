export type ChordShape = {
  /** 6 valores, cuerdas 6ª→1ª: -1 muteada, 0 al aire, n>0 traste pisado
   *  (relativo a baseFret, como en chords-db). */
  frets: number[];
  /** Trastes (relativos) donde hay cejilla. */
  barres?: number[];
  /** Traste real donde inicia la ventana; 1 = posición abierta. */
  baseFret?: number;
};

/* Geometría base del handoff: padX 16, padTop 24, gap cuerdas 15,
   gap trastes 21, 4 trastes visibles. Colores vía tokens de tema. */
const PAD_X = 16;
const PAD_TOP = 24;
const STRING_GAP = 15;
const FRET_GAP = 21;
const FRETS_SHOWN = 4;

export function ChordDiagram({
  frets,
  barres = [],
  baseFret = 1,
  scale = 1,
}: ChordShape & { scale?: number }) {
  const shifted = baseFret > 1;
  const leftPad = PAD_X + (shifted ? 15 : 0);
  const gridW = STRING_GAP * 5;
  const svgW = leftPad + gridW + PAD_X;
  const gridH = FRET_GAP * FRETS_SHOWN;
  const svgH = PAD_TOP + gridH + 6;

  const stringX = (i: number) => leftPad + i * STRING_GAP;
  const fretY = (f: number) => PAD_TOP + (f - 0.5) * FRET_GAP;

  /* Una cejilla abarca desde la primera hasta la última cuerda pisada en ese traste. */
  const barreSpans = barres
    .map((b) => {
      const covered = frets.map((f, i) => (f === b ? i : -1)).filter((i) => i >= 0);
      return covered.length >= 2
        ? { fret: b, from: covered[0], to: covered[covered.length - 1] }
        : null;
    })
    .filter((b): b is { fret: number; from: number; to: number } => b !== null);

  const isBarred = (f: number) => barreSpans.some((b) => b.fret === f);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width={svgW * scale}
      height={svgH * scale}
      className="block"
      aria-hidden
    >
      {/* cuerdas */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`s${i}`}
          x1={stringX(i)}
          y1={PAD_TOP}
          x2={stringX(i)}
          y2={PAD_TOP + gridH}
          stroke="var(--diagram-grid)"
          strokeWidth={1.4}
        />
      ))}
      {/* trastes (el primero es la cejuela gruesa en posición abierta) */}
      {Array.from({ length: FRETS_SHOWN + 1 }, (_, k) => (
        <line
          key={`f${k}`}
          x1={leftPad}
          y1={PAD_TOP + k * FRET_GAP}
          x2={leftPad + gridW}
          y2={PAD_TOP + k * FRET_GAP}
          stroke={k === 0 && !shifted ? "var(--diagram-nut)" : "var(--diagram-grid)"}
          strokeWidth={k === 0 && !shifted ? 3.6 : 1.4}
          strokeLinecap="round"
        />
      ))}
      {/* etiqueta del traste inicial */}
      {shifted && (
        <text
          x={leftPad - 7}
          y={PAD_TOP + FRET_GAP * 0.62}
          textAnchor="end"
          fontSize={10}
          fontWeight={700}
          fill="var(--diagram-mark)"
          fontFamily="var(--font-inter), sans-serif"
        >
          {baseFret}fr
        </text>
      )}
      {/* cejillas */}
      {barreSpans.map((b, i) => (
        <rect
          key={`b${i}`}
          x={stringX(b.from) - 6}
          y={fretY(b.fret) - 6}
          width={(b.to - b.from) * STRING_GAP + 12}
          height={12}
          rx={6}
          fill="var(--accent-dot)"
          opacity={0.92}
        />
      ))}
      {/* marcas ×/○ y puntos */}
      {frets.map((f, i) => {
        const x = stringX(i);
        if (f === -1) {
          const y = PAD_TOP - 12;
          const r = 3.6;
          return (
            <g
              key={`m${i}`}
              stroke="var(--diagram-mark)"
              strokeWidth={1.7}
              strokeLinecap="round"
            >
              <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
              <line x1={x + r} y1={y - r} x2={x - r} y2={y + r} />
            </g>
          );
        }
        if (f === 0) {
          return (
            <circle
              key={`m${i}`}
              cx={x}
              cy={PAD_TOP - 12}
              r={4}
              fill="none"
              stroke="var(--diagram-mark)"
              strokeWidth={1.6}
            />
          );
        }
        if (isBarred(f)) return null;
        return (
          <circle key={`m${i}`} cx={x} cy={fretY(f)} r={6} fill="var(--accent-dot)" />
        );
      })}
    </svg>
  );
}
