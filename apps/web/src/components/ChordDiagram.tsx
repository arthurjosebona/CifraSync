import { fingerCount, getInstrument, type InstrumentId } from '@cifrasync/core';

export interface ChordDiagramProps {
  /** Casa de cada corda, da mais grave à mais aguda (-1 abafada, 0 solta). */
  frets: number[];
  instrument: InstrumentId;
  /** Espelha o diagrama para canhotos (corda mais grave à direita). */
  lefty?: boolean;
  /** Largura em pixels; a altura acompanha. */
  size?: number;
  /** Nome exibido acima (ex.: "Am"). */
  name?: string;
  className?: string;
}

const SHOWN = 5;

/** Diagrama de acorde em SVG, desenhado com `currentColor` para seguir o tema. */
export function ChordDiagram({
  frets,
  instrument,
  lefty = false,
  size = 96,
  name,
  className,
}: ChordDiagramProps) {
  const inst = getInstrument(instrument);
  const order = lefty ? [...frets.keys()].reverse() : [...frets.keys()];
  const n = frets.length;
  const fretted = frets.filter((f) => f > 0);
  const max = fretted.length ? Math.max(...fretted) : 0;
  const start = max > SHOWN - 1 ? Math.min(...fretted) : 1;
  const { barre } = fingerCount(frets);

  const pad = 18;
  const top = name ? 34 : 20;
  const w = 100;
  const gapX = (w - pad * 2) / (n - 1);
  const gapY = 20;
  const h = top + SHOWN * gapY + 16;
  const x = (pos: number) => pad + pos * gapX;
  const y = (fret: number) => top + (fret - start + 0.5) * gapY;

  let barreRect = null;
  if (barre !== null) {
    const positions = order
      .map((s, pos) => ({ s, pos }))
      .filter(({ s }) => frets[s] === barre)
      .map(({ pos }) => pos);
    const from = Math.min(...positions);
    const to = Math.max(...positions);
    barreRect = (
      <rect
        x={x(from) - 6}
        y={y(barre) - 6}
        width={x(to) - x(from) + 12}
        height={12}
        rx={6}
        fill="currentColor"
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      className={className}
      role="img"
      aria-label={`${name ?? 'Acorde'}: ${frets.map((f) => (f < 0 ? 'x' : f)).join(' ')}`}
    >
      {name && (
        <text
          x={w / 2}
          y={14}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill="currentColor"
        >
          {name}
        </text>
      )}
      {start === 1 ? (
        <rect x={pad - 1} y={top - 4} width={w - pad * 2 + 2} height={4} fill="currentColor" />
      ) : (
        <text x={pad - 6} y={y(start) + 4} textAnchor="end" fontSize={10} fill="currentColor">
          {start}
        </text>
      )}
      {Array.from({ length: SHOWN + 1 }, (_, i) => (
        <line
          key={`f${i}`}
          x1={pad}
          x2={w - pad}
          y1={top + i * gapY}
          y2={top + i * gapY}
          stroke="currentColor"
          strokeOpacity={0.5}
        />
      ))}
      {order.map((s, pos) => (
        <line
          key={`s${s}`}
          x1={x(pos)}
          x2={x(pos)}
          y1={top}
          y2={top + SHOWN * gapY}
          stroke="currentColor"
          strokeOpacity={0.7}
        />
      ))}
      {barreRect}
      {order.map((s, pos) => {
        const f = frets[s]!;
        if (f < 0)
          return (
            <text
              key={`m${s}`}
              x={x(pos)}
              y={top - 8}
              textAnchor="middle"
              fontSize={11}
              fill="currentColor"
            >
              ×
            </text>
          );
        if (f === 0)
          return (
            <circle
              key={`o${s}`}
              cx={x(pos)}
              cy={top - 12}
              r={4}
              fill="none"
              stroke="currentColor"
            />
          );
        if (f === barre) return null;
        return <circle key={`d${s}`} cx={x(pos)} cy={y(f)} r={6} fill="currentColor" />;
      })}
      {order.map((s, pos) => (
        <text
          key={`n${s}`}
          x={x(pos)}
          y={h - 3}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.6}
        >
          {inst.stringNames[s]}
        </text>
      ))}
    </svg>
  );
}
